/**
 * SessionRepository — data access for sessions / refresh tokens (A.3).
 */

import { prisma } from "@/lib/prisma";

export class SessionRepository {
  async createSession(data: {
    identityId: string;
    deviceId?: string | null;
    sessionTokenHash: string;
    userAgent?: string | null;
    deviceLabel?: string | null;
    ipAddress?: string | null;
    browser?: string | null;
    os?: string | null;
    platform?: string | null;
    deviceType?: string | null;
    expiresAt: Date;
    absoluteExpiresAt: Date;
    rememberMe: boolean;
    creationSource?: string;
    riskLevel?: string;
    refreshTokenHash: string;
    refreshExpiresAt: Date;
  }) {
    return prisma.iamSession.create({
      data: {
        identityId: data.identityId,
        deviceId: data.deviceId ?? null,
        sessionTokenHash: data.sessionTokenHash,
        userAgent: data.userAgent ?? null,
        deviceLabel: data.deviceLabel ?? null,
        ipAddress: data.ipAddress ?? null,
        browser: data.browser ?? null,
        os: data.os ?? null,
        platform: data.platform ?? null,
        deviceType: data.deviceType ?? null,
        expiresAt: data.expiresAt,
        absoluteExpiresAt: data.absoluteExpiresAt,
        rememberMe: data.rememberMe,
        creationSource: data.creationSource ?? "login",
        riskLevel: data.riskLevel ?? "UNKNOWN",
        lastActivityAt: new Date(),
        refreshTokens: {
          create: {
            identityId: data.identityId,
            tokenHash: data.refreshTokenHash,
            expiresAt: data.refreshExpiresAt,
          },
        },
      },
      include: { device: true },
    });
  }

  async findBySessionTokenHash(hash: string) {
    return prisma.iamSession.findUnique({
      where: { sessionTokenHash: hash },
      include: { identity: true, device: true },
    });
  }

  async findById(id: string) {
    return prisma.iamSession.findUnique({
      where: { id },
      include: {
        device: true,
        refreshTokens: { orderBy: { createdAt: "desc" }, take: 20 },
        audits: { orderBy: { createdAt: "desc" }, take: 50 },
        identity: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
  }

  async listForIdentity(identityId: string, take = 50) {
    return prisma.iamSession.findMany({
      where: { identityId, archivedAt: null },
      include: { device: true },
      orderBy: { lastActivityAt: "desc" },
      take,
    });
  }

  async listActiveForIdentity(identityId: string) {
    return prisma.iamSession.findMany({
      where: {
        identityId,
        revokedAt: null,
        archivedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async adminSearch(params: {
    identityId?: string;
    email?: string;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(params.limit ?? 50, 200);
    const offset = params.offset ?? 0;
    const where: Record<string, unknown> = { archivedAt: null };
    if (params.identityId) where.identityId = params.identityId;
    if (params.activeOnly) {
      where.revokedAt = null;
      where.expiresAt = { gt: new Date() };
    }
    if (params.email) {
      where.identity = {
        emailNormalized: params.email.trim().toLowerCase(),
      };
    }
    const [rows, total] = await Promise.all([
      prisma.iamSession.findMany({
        where,
        include: {
          device: true,
          identity: {
            select: { id: true, email: true, displayName: true },
          },
        },
        orderBy: { lastActivityAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.iamSession.count({ where }),
    ]);
    return { rows, total, limit, offset };
  }

  async revoke(sessionId: string, reason: string) {
    return prisma.$transaction([
      prisma.iamSession.update({
        where: { id: sessionId },
        data: { revokedAt: new Date(), revokeReason: reason },
      }),
      prisma.iamRefreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async touch(sessionId: string, expiresAt?: Date) {
    return prisma.iamSession.update({
      where: { id: sessionId },
      data: {
        lastActivityAt: new Date(),
        ...(expiresAt ? { expiresAt } : {}),
      },
    });
  }

  async countActive(identityId: string) {
    return prisma.iamSession.count({
      where: {
        identityId,
        revokedAt: null,
        archivedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findExpiredActive(batch: number) {
    return prisma.iamSession.findMany({
      where: {
        revokedAt: null,
        archivedAt: null,
        expiresAt: { lte: new Date() },
      },
      take: batch,
    });
  }

  async findIdleCandidates(idleBefore: Date, batch: number) {
    return prisma.iamSession.findMany({
      where: {
        revokedAt: null,
        archivedAt: null,
        lastActivityAt: { lte: idleBefore },
        expiresAt: { gt: new Date() },
      },
      take: batch,
    });
  }

  async archiveOld(before: Date, batch: number) {
    const rows = await prisma.iamSession.findMany({
      where: {
        archivedAt: null,
        OR: [
          { revokedAt: { not: null, lte: before } },
          { expiresAt: { lte: before } },
        ],
      },
      take: batch,
      select: { id: true },
    });
    if (!rows.length) return 0;
    await prisma.iamSession.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { archivedAt: new Date() },
    });
    return rows.length;
  }

  async deleteExpiredRefreshTokens(batch: number) {
    const rows = await prisma.iamRefreshToken.findMany({
      where: {
        OR: [
          { expiresAt: { lte: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
      take: batch,
      select: { id: true },
    });
    // Keep recent revoked for rotation reuse detection — only delete long-expired
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await prisma.iamRefreshToken.deleteMany({
      where: {
        expiresAt: { lte: cutoff },
        OR: [{ rotatedAt: { not: null } }, { revokedAt: { not: null } }],
      },
    });
    return result.count;
  }

  async getSessionVersion(identityId: string) {
    const row = await prisma.iamIdentity.findUnique({
      where: { id: identityId },
      select: { sessionVersion: true },
    });
    return row?.sessionVersion ?? 0;
  }

  async incrementSessionVersion(identityId: string) {
    const row = await prisma.iamIdentity.update({
      where: { id: identityId },
      data: { sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });
    return row.sessionVersion;
  }
}

export const sessionRepository = new SessionRepository();
