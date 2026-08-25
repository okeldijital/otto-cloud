/**
 * EmailVerificationService — single-use, expiring, hashed verification tokens.
 */

import { prisma } from "@/lib/prisma";
import { getPlatformConfig } from "@/lib/platform/config";
import { IdentityError } from "../../domain/types";
import { generateSecureToken, hashToken, normalizeEmail } from "../crypto/tokens";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../events";
import { rateLimitService } from "../rate-limit/rate-limit-service";

const OTTO_PUBLIC_URL = "https://otto.okeldijital.africa";

function getPublicAppUrl(): string {
  const configured =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (!configured) return OTTO_PUBLIC_URL;

  const normalized = configured.replace(/\/$/, "");
  if (/^https?:\/\/localhost(?::\d+)?$/i.test(normalized)) {
    return OTTO_PUBLIC_URL;
  }

  return normalized;
}

export class EmailVerificationService {
  private ttlHours(): number {
    return getPlatformConfig().security.tokens.emailVerificationTtlHours;
  }

  async requestVerification(params: {
    identityId: string;
    email?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ token: string; expiresAt: Date; verifyUrl: string }> {
    const identity = await prisma.iamIdentity.findUnique({
      where: { id: params.identityId },
    });
    if (!identity) {
      throw new IdentityError("Identity not found", 404, "IDENTITY_NOT_FOUND");
    }
    if (identity.emailVerifiedAt) {
      throw new IdentityError(
        "Email already verified",
        400,
        "EMAIL_ALREADY_VERIFIED"
      );
    }

    const email = params.email ?? identity.email;
    rateLimitService.assertVerificationResend({
      email,
      ip: params.ipAddress,
    });

    await prisma.iamEmailVerificationToken.updateMany({
      where: {
        identityId: identity.id,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    const raw = generateSecureToken(32);
    const expiresAt = new Date(
      Date.now() + this.ttlHours() * 60 * 60 * 1000
    );

    await prisma.iamEmailVerificationToken.create({
      data: {
        identityId: identity.id,
        tokenHash: hashToken(raw),
        expiresAt,
      },
    });

    const verifyUrl = `${getPublicAppUrl()}/auth/verify-email?token=${encodeURIComponent(raw)}`;

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.EmailVerificationSent,
      identityId: identity.id,
      payload: {
        email: identity.email,
        expiresAt: expiresAt.toISOString(),
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    const { emailVerificationContent, sendTransactionalEmail } = await import(
      "./mailer"
    );
    const content = emailVerificationContent({
      email: identity.email,
      verifyUrl,
    });
    const delivery = await sendTransactionalEmail({
      to: identity.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      tags: ["email-verification"],
    });

    if (!delivery.ok) {
      throw new IdentityError(
        "Verification email could not be sent",
        502,
        "EMAIL_DELIVERY_FAILED"
      );
    }

    return { token: raw, expiresAt, verifyUrl };
  }

  async requestByEmail(params: {
    email: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ sent: boolean }> {
    const emailNormalized = normalizeEmail(params.email);
    const identity = await prisma.iamIdentity.findUnique({
      where: { emailNormalized },
    });
    if (!identity || identity.emailVerifiedAt) {
      return { sent: true };
    }
    await this.requestVerification({
      identityId: identity.id,
      email: identity.email,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
    return { sent: true };
  }

  async verifyToken(params: {
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ identityId: string; email: string }> {
    const hash = hashToken(params.token);
    const record = await prisma.iamEmailVerificationToken.findUnique({
      where: { tokenHash: hash },
      include: { identity: true },
    });

    if (!record) {
      throw new IdentityError(
        "Invalid or expired verification token",
        400,
        "INVALID_VERIFICATION_TOKEN"
      );
    }
    if (record.usedAt) {
      throw new IdentityError(
        "Verification token already used",
        400,
        "VERIFICATION_TOKEN_USED"
      );
    }
    if (record.expiresAt <= new Date()) {
      throw new IdentityError(
        "Verification token expired",
        400,
        "VERIFICATION_TOKEN_EXPIRED"
      );
    }

    await prisma.$transaction([
      prisma.iamEmailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.iamIdentity.update({
        where: { id: record.identityId },
        data: {
          emailVerifiedAt: new Date(),
          status:
            record.identity.status === "pending_verification"
              ? "active"
              : record.identity.status,
        },
      }),
    ]);

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.EmailVerified,
      identityId: record.identityId,
      payload: { email: record.identity.email },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      identityId: record.identityId,
      email: record.identity.email,
    };
  }
}

export const emailVerificationService = new EmailVerificationService();
