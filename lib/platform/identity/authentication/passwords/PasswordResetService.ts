/**
 * PasswordResetService — forgot / reset token lifecycle (A.2).
 * Tokens are CSPRNG, hashed at rest, single-use, expiring.
 *
 * Delivery: Resend when RESEND_API_KEY is set; otherwise the link is written
 * to application logs (Vercel Function logs) so ops can recover. Response
 * never includes the raw token in production unless IAM_EXPOSE_AUTH_LINKS=true.
 */

import { getPlatformConfig } from "@/lib/platform/config";
import { IdentityError } from "../../domain/types";
import {
  generateSecureToken,
  hashToken,
  normalizeEmail,
} from "../crypto/tokens";
import { passwordRepository } from "../repositories/PasswordRepository";
import { rateLimitService } from "../rate-limit/rate-limit-service";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../events";
import {
  isOutboundEmailConfigured,
  passwordResetEmailContent,
  sendTransactionalEmail,
  shouldExposeAuthLinksInResponse,
  type EmailDeliveryChannel,
} from "../email/mailer";

export type PasswordResetRequestResult = {
  /** Always true when request accepted (anti-enumeration). */
  sent: boolean;
  /**
   * How the link was delivered for *this* request when an account matched.
   * When no account matched, channel is still reported as configured capability
   * so the UI can explain missing email without leaking existence.
   */
  delivery: EmailDeliveryChannel;
  /** True when Resend (or other outbound) is configured on this deployment. */
  emailConfigured: boolean;
  /** One-time URL — only in non-production or when IAM_EXPOSE_AUTH_LINKS=true. */
  resetUrl?: string;
};

export class PasswordResetService {
  private ttlMinutes(): number {
    return getPlatformConfig().security.tokens.passwordResetTtlMinutes;
  }

  private publicAppBase(): string {
    const raw =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_URL ||
      process.env.APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      "http://localhost:3000";
    return raw.replace(/\/$/, "");
  }

  /**
   * Always returns success shape — no user enumeration of account existence.
   */
  async requestReset(params: {
    email: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<PasswordResetRequestResult> {
    const email = params.email?.trim() ?? "";
    if (!email) {
      throw new IdentityError("Email required", 400, "VALIDATION_ERROR");
    }

    rateLimitService.assertPasswordReset({
      email,
      ip: params.ipAddress,
    });

    const emailConfigured = isOutboundEmailConfigured();
    const emailNormalized = normalizeEmail(email);
    const identity = await passwordRepository.findIdentityByEmailNormalized(
      emailNormalized
    );

    // Identical outer shape whether or not account exists
    if (!identity || identity.status === "disabled") {
      await emitIdentityEvent({
        eventType: IDENTITY_EVENTS.PasswordResetRequested,
        payload: { email: emailNormalized, found: false },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
      return {
        sent: true,
        delivery: emailConfigured ? "resend" : "log",
        emailConfigured,
      };
    }

    await passwordRepository.invalidateUnusedResetTokens(identity.id);

    const raw = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + this.ttlMinutes() * 60 * 1000);

    await passwordRepository.createResetToken({
      identityId: identity.id,
      tokenHash: hashToken(raw),
      expiresAt,
    });

    const resetUrl = `${this.publicAppBase()}/auth/reset-password?token=${encodeURIComponent(raw)}`;
    const content = passwordResetEmailContent({
      email: identity.email,
      resetUrl,
      ttlMinutes: this.ttlMinutes(),
    });

    const delivery = await sendTransactionalEmail({
      to: identity.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      tags: ["password-reset"],
    });

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.PasswordResetRequested,
      identityId: identity.id,
      payload: {
        email: identity.email,
        expiresAt: expiresAt.toISOString(),
        found: true,
        delivery: delivery.channel,
        deliveryOk: delivery.ok,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    const expose = shouldExposeAuthLinksInResponse();

    return {
      sent: true,
      delivery: delivery.channel,
      emailConfigured,
      ...(expose ? { resetUrl } : {}),
    };
  }

  /**
   * Validate and consume reset token. Throws on invalid/used/expired (replay).
   */
  async consumeToken(token: string): Promise<{
    identityId: string;
    email: string;
    tokenId: string;
    currentHash: string | null;
    credentialId: string | null;
  }> {
    if (!token) {
      throw new IdentityError(
        "Invalid or expired reset token",
        400,
        "INVALID_RESET_TOKEN"
      );
    }

    const record = await passwordRepository.findResetTokenByHash(
      hashToken(token)
    );

    if (!record) {
      throw new IdentityError(
        "Invalid or expired reset token",
        400,
        "INVALID_RESET_TOKEN"
      );
    }

    // Replay detection
    if (record.usedAt) {
      throw new IdentityError(
        "Reset token already used",
        400,
        "RESET_TOKEN_REPLAY"
      );
    }

    if (record.expiresAt <= new Date()) {
      throw new IdentityError(
        "Invalid or expired reset token",
        400,
        "INVALID_RESET_TOKEN"
      );
    }

    await passwordRepository.markResetTokenUsed(record.id);

    const cred = record.identity.passwordCreds[0] ?? null;
    return {
      identityId: record.identityId,
      email: record.identity.email,
      tokenId: record.id,
      currentHash: cred?.passwordHash ?? null,
      credentialId: cred?.id ?? null,
    };
  }
}

export const passwordResetService = new PasswordResetService();
