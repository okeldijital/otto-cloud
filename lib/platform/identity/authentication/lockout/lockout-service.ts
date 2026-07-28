import { prisma } from "@/lib/prisma";
import { getPlatformConfig } from "@/lib/platform/config";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../events";

export class LockoutService {
  isLocked(identity: {
    lockedUntil: Date | null;
    status: string;
  }): boolean {
    if (identity.status === "locked") {
      if (identity.lockedUntil && identity.lockedUntil > new Date()) return true;
      if (!identity.lockedUntil) return true;
    }
    if (identity.lockedUntil && identity.lockedUntil > new Date()) return true;
    return false;
  }

  async recordFailure(params: {
    identityId: string;
    email: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ locked: boolean; lockedUntil: Date | null }> {
    const policy = getPlatformConfig().security.lockout;
    const identity = await prisma.iamIdentity.update({
      where: { id: params.identityId },
      data: { failedLoginCount: { increment: 1 } },
    });

    await prisma.iamLoginAttempt.create({
      data: {
        identityId: params.identityId,
        email: params.email,
        success: false,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        reason: "invalid_credentials",
      },
    });

    if (identity.failedLoginCount >= policy.maxAttempts) {
      const lockedUntil = new Date(
        Date.now() + policy.durationMinutes * 60 * 1000
      );
      await prisma.iamIdentity.update({
        where: { id: params.identityId },
        data: {
          status: "locked",
          lockedUntil,
        },
      });
      await emitIdentityEvent({
        eventType: IDENTITY_EVENTS.AccountLocked,
        identityId: params.identityId,
        payload: { lockedUntil: lockedUntil.toISOString() },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
      return { locked: true, lockedUntil };
    }

    return { locked: false, lockedUntil: null };
  }

  async recordSuccess(params: {
    identityId: string;
    email: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await prisma.iamIdentity.update({
      where: { id: params.identityId },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        status: "active",
        lastLoginAt: new Date(),
      },
    });
    await prisma.iamLoginAttempt.create({
      data: {
        identityId: params.identityId,
        email: params.email,
        success: true,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }

  async unlock(identityId: string): Promise<void> {
    await prisma.iamIdentity.update({
      where: { id: identityId },
      data: {
        status: "active",
        lockedUntil: null,
        failedLoginCount: 0,
      },
    });
    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.AccountUnlocked,
      identityId,
      payload: {},
    });
  }

  /** Auto-unlock when lockout window elapsed */
  async maybeAutoUnlock(identity: {
    id: string;
    status: string;
    lockedUntil: Date | null;
  }): Promise<void> {
    if (
      identity.lockedUntil &&
      identity.lockedUntil <= new Date() &&
      (identity.status === "locked" || identity.lockedUntil)
    ) {
      await prisma.iamIdentity.update({
        where: { id: identity.id },
        data: {
          status: "active",
          lockedUntil: null,
          failedLoginCount: 0,
        },
      });
    }
  }
}

export const lockoutService = new LockoutService();
