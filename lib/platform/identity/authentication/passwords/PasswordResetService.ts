/**
 * PasswordResetService — forgot / reset token lifecycle (A.2).
 * Tokens are CSPRNG, hashed at rest, single-use, expiring.
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

export class PasswordResetService {
  private ttlMinutes(): number {
    return getPlatformConfig().security.tokens.passwordResetTtlMinutes;
  }

  /**
   * Always returns success shape — no user enumeration.
   */
  async requestReset(params: {
    email: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ sent: boolean; resetUrl?: string }> {
    const email = params.email?.trim() ?? "";
    if (!email) {
      throw new IdentityError("Email required", 400, "VALIDATION_ERROR");
    }

    rateLimitService.assertPasswordReset({
      email,
      ip: params.ipAddress,
    });

    const emailNormalized = normalizeEmail(email);
    const identity = await passwordRepository.findIdentityByEmailNormalized(
      emailNormalized
    );

    // Identical response whether or not account exists
    if (!identity || identity.status === "disabled") {
      await emitIdentityEvent({
        eventType: IDENTITY_EVENTS.PasswordResetRequested,
        payload: { email: emailNormalized, found: false },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
      return { sent: true };
    }

    await passwordRepository.invalidateUnusedResetTokens(identity.id);

    const raw = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + this.ttlMinutes() * 60 * 1000);

    await passwordRepository.createResetToken({
      identityId: identity.id,
      tokenHash: hashToken(raw),
      expiresAt,
    });

    const base =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_URL ||
      process.env.APP_URL ||
      "http://localhost:3000";
    const resetUrl = `${base}/auth/reset-password?token=${encodeURIComponent(raw)}`;

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.PasswordResetRequested,
      identityId: identity.id,
      payload: {
        email: identity.email,
        expiresAt: expiresAt.toISOString(),
        found: true,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    if (process.env.NODE_ENV !== "production") {
      console.info(`[iam] password reset link for ${identity.email}: ${resetUrl}`);
    }

    return {
      sent: true,
      ...(process.env.NODE_ENV !== "production" ? { resetUrl } : {}),
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
