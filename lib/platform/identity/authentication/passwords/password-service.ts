/**
 * PasswordService (A.2) — change password + reset flow.
 *
 * Tokens: CSPRNG, hashed at rest, single-use, expiring.
 * History: previous hashes stored; policy rejects reuse of recent passwords.
 */

import { prisma } from "@/lib/prisma";
import { getPlatformConfig } from "@/lib/platform/config";
import { IdentityError } from "../../domain/types";
import { hashPassword, verifyPassword } from "../crypto/password";
import {
  generateSecureToken,
  hashToken,
  normalizeEmail,
} from "../crypto/tokens";
import { assertPasswordStrength } from "./password-policy";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../events";
import { sessionService } from "../sessions/session-service";
import { rateLimitService } from "../rate-limit/rate-limit-service";

const HISTORY_LIMIT = 5;

export class PasswordService {
  private resetTtlMinutes(): number {
    return getPlatformConfig().security.tokens.passwordResetTtlMinutes;
  }

  async changePassword(params: {
    identityId: string;
    currentPassword: string;
    newPassword: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    /** Revoke all sessions except current after change */
    currentSessionId?: string | null;
  }): Promise<void> {
    assertPasswordStrength(params.newPassword);

    const identity = await prisma.iamIdentity.findUnique({
      where: { id: params.identityId },
      include: { passwordCreds: true },
    });
    if (!identity) {
      throw new IdentityError("Identity not found", 404, "IDENTITY_NOT_FOUND");
    }

    const cred = identity.passwordCreds[0];
    if (!cred) {
      throw new IdentityError(
        "No password credential",
        400,
        "NO_PASSWORD_CREDENTIAL"
      );
    }

    const ok = await verifyPassword(params.currentPassword, cred.passwordHash);
    if (!ok) {
      throw new IdentityError(
        "Current password is incorrect",
        401,
        "INVALID_CURRENT_PASSWORD"
      );
    }

    await this.assertNotInHistory(params.identityId, params.newPassword);
    // Also reject if same as current
    if (await verifyPassword(params.newPassword, cred.passwordHash)) {
      throw new IdentityError(
        "New password must differ from current password",
        400,
        "PASSWORD_REUSE"
      );
    }

    const newHash = await hashPassword(params.newPassword);

    await prisma.$transaction([
      prisma.iamPasswordHistory.create({
        data: {
          identityId: params.identityId,
          passwordHash: cred.passwordHash,
        },
      }),
      prisma.iamPasswordCredential.update({
        where: { id: cred.id },
        data: {
          passwordHash: newHash,
          passwordChangedAt: new Date(),
        },
      }),
    ]);

    await this.trimHistory(params.identityId);

    // Revoke other sessions for security
    await sessionService.revokeAllSessions(
      params.identityId,
      "password_changed",
      params.currentSessionId ?? undefined
    );

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.PasswordChanged,
      identityId: params.identityId,
      payload: { method: "change" },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Always returns success shape for unknown emails (no enumeration).
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
    const identity = await prisma.iamIdentity.findUnique({
      where: { emailNormalized },
    });

    if (!identity || identity.status === "disabled") {
      return { sent: true };
    }

    // Invalidate prior unused reset tokens
    await prisma.iamPasswordResetToken.updateMany({
      where: { identityId: identity.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const raw = generateSecureToken(32);
    const expiresAt = new Date(
      Date.now() + this.resetTtlMinutes() * 60 * 1000
    );

    await prisma.iamPasswordResetToken.create({
      data: {
        identityId: identity.id,
        tokenHash: hashToken(raw),
        expiresAt,
      },
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

  async completeReset(params: {
    token: string;
    newPassword: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ identityId: string }> {
    assertPasswordStrength(params.newPassword);

    const hash = hashToken(params.token);
    const record = await prisma.iamPasswordResetToken.findUnique({
      where: { tokenHash: hash },
      include: {
        identity: { include: { passwordCreds: true } },
      },
    });

    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw new IdentityError(
        "Invalid or expired reset token",
        400,
        "INVALID_RESET_TOKEN"
      );
    }

    const identity = record.identity;
    await this.assertNotInHistory(identity.id, params.newPassword);

    const newHash = await hashPassword(params.newPassword);
    const cred = identity.passwordCreds[0];

    await prisma.$transaction(async (tx) => {
      await tx.iamPasswordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      if (cred) {
        await tx.iamPasswordHistory.create({
          data: {
            identityId: identity.id,
            passwordHash: cred.passwordHash,
          },
        });
        await tx.iamPasswordCredential.update({
          where: { id: cred.id },
          data: {
            passwordHash: newHash,
            passwordChangedAt: new Date(),
          },
        });
      } else {
        await tx.iamPasswordCredential.create({
          data: {
            identityId: identity.id,
            passwordHash: newHash,
            algorithm: "argon2id",
            passwordChangedAt: new Date(),
          },
        });
      }

      // Unlock if locked
      await tx.iamIdentity.update({
        where: { id: identity.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
          status:
            identity.status === "locked" ? "active" : identity.status,
        },
      });
    });

    await this.trimHistory(identity.id);
    await sessionService.revokeAllSessions(identity.id, "password_reset");

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.PasswordResetCompleted,
      identityId: identity.id,
      payload: { email: identity.email },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return { identityId: identity.id };
  }

  private async assertNotInHistory(
    identityId: string,
    newPassword: string
  ): Promise<void> {
    const history = await prisma.iamPasswordHistory.findMany({
      where: { identityId },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    });
    for (const h of history) {
      if (await verifyPassword(newPassword, h.passwordHash)) {
        throw new IdentityError(
          "Password was used recently",
          400,
          "PASSWORD_REUSE"
        );
      }
    }
  }

  private async trimHistory(identityId: string): Promise<void> {
    const rows = await prisma.iamPasswordHistory.findMany({
      where: { identityId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (rows.length <= HISTORY_LIMIT) return;
    const drop = rows.slice(HISTORY_LIMIT).map((r) => r.id);
    await prisma.iamPasswordHistory.deleteMany({
      where: { id: { in: drop } },
    });
  }
}

export const passwordService = new PasswordService();
