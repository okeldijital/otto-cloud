/**
 * TrustedDeviceService — foundation for A.4 MFA trust (A.3 model only).
 * Fields exist; MFA challenge skip is activated in A.4.
 */

import { prisma } from "@/lib/prisma";
import { getPlatformConfig } from "@/lib/platform/config";
import { generateSecureToken, hashToken } from "../crypto/tokens";
import { sessionAuditService } from "./SessionAuditService";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../events";

export class TrustedDeviceService {
  private days(): number {
    return getPlatformConfig().security.session.trustedDeviceDays;
  }

  async create(params: {
    identityId: string;
    deviceId?: string | null;
    userAgent?: string | null;
    label?: string | null;
  }): Promise<{ token: string; expiresAt: Date; id: string }> {
    const opaque = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + this.days() * 24 * 60 * 60 * 1000);
    const now = new Date();
    const row = await prisma.iamTrustedDevice.create({
      data: {
        identityId: params.identityId,
        deviceId: params.deviceId ?? null,
        deviceTokenHash: hashToken(opaque),
        label: params.label ?? null,
        userAgent: params.userAgent ?? null,
        trusted: true,
        trustedAt: now,
        trustedUntil: expiresAt,
        lastUsedAt: now,
        expiresAt,
      },
    });

    await sessionAuditService.record({
      identityId: params.identityId,
      action: "device_trusted",
      userAgent: params.userAgent,
      payload: { trustedDeviceId: row.id, deviceId: params.deviceId },
    });

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.SessionTrusted,
      identityId: params.identityId,
      payload: { trustedDeviceId: row.id },
      userAgent: params.userAgent,
    });

    return { token: opaque, expiresAt, id: row.id };
  }

  async isTrusted(
    identityId: string,
    deviceToken: string | undefined
  ): Promise<boolean> {
    if (!deviceToken) return false;
    const row = await prisma.iamTrustedDevice.findUnique({
      where: { deviceTokenHash: hashToken(deviceToken) },
    });
    if (!row || row.identityId !== identityId) return false;
    if (row.revokedAt || !row.trusted) return false;
    if (row.expiresAt <= new Date()) return false;
    if (row.trustedUntil && row.trustedUntil <= new Date()) return false;
    await prisma.iamTrustedDevice.update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    });
    return true;
  }

  async revoke(params: {
    identityId: string;
    trustedDeviceId: string;
  }): Promise<void> {
    await prisma.iamTrustedDevice.updateMany({
      where: {
        id: params.trustedDeviceId,
        identityId: params.identityId,
        revokedAt: null,
      },
      data: { revokedAt: new Date(), trusted: false },
    });
    await sessionAuditService.record({
      identityId: params.identityId,
      action: "device_revoked",
      payload: { trustedDeviceId: params.trustedDeviceId },
    });
    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.SessionUntrusted,
      identityId: params.identityId,
      payload: { trustedDeviceId: params.trustedDeviceId },
    });
  }

  async list(identityId: string) {
    return prisma.iamTrustedDevice.findMany({
      where: { identityId, revokedAt: null },
      orderBy: { lastUsedAt: "desc" },
    });
  }
}

export const trustedDeviceService = new TrustedDeviceService();
