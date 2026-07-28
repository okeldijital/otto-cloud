/**
 * SessionService — authoritative session lifecycle (A.3).
 *
 * Identity → Session → Refresh Token → Access Token
 * Refresh tokens never exist outside a session.
 */

import { IdentityError } from "../../domain/types";
import { tokenService } from "../tokens/token-service";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../events";
import { sessionPolicyService } from "../policies/SessionPolicyService";
import { sessionRepository } from "../repositories/SessionRepository";
import { deviceService } from "./DeviceService";
import { sessionAuditService } from "./SessionAuditService";
import type {
  SessionDetailDto,
  SessionListItemDto,
} from "../dto/SessionDto";

export type SessionCreateResult = {
  sessionId: string;
  sessionToken: string;
  refreshToken: string;
  accessToken: string;
  accessExpiresAt: Date;
  sessionExpiresAt: Date;
  refreshExpiresAt: Date;
  sessionMaxAgeSeconds: number;
  refreshMaxAgeSeconds: number;
  accessMaxAgeSeconds: number;
  deviceId: string | null;
};

export type RefreshResult = {
  sessionId: string;
  identityId: string;
  organizationId: string | null;
  refreshToken: string;
  accessToken: string;
  accessExpiresAt: Date;
  sessionExpiresAt: Date;
  refreshExpiresAt: Date;
  sessionMaxAgeSeconds: number;
  refreshMaxAgeSeconds: number;
  accessMaxAgeSeconds: number;
};

export class SessionService {
  async createSession(params: {
    identityId: string;
    organizationId?: string | null;
    rememberMe?: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceLabel?: string | null;
    creationSource?: string;
  }): Promise<SessionCreateResult> {
    const rememberMe = params.rememberMe ?? false;
    const lt = sessionPolicyService.lifetimes(rememberMe);
    const p = sessionPolicyService.getPolicy();

    // Concurrent session limit — revoke oldest excess
    if (p.maxConcurrentSessions > 0) {
      const active = await sessionRepository.listActiveForIdentity(
        params.identityId
      );
      const overflow = active.length - p.maxConcurrentSessions + 1;
      if (overflow > 0) {
        for (let i = 0; i < overflow; i++) {
          await this.revokeSession(active[i].id, "max_concurrent", {
            identityId: params.identityId,
          });
        }
      }
    }

    const { deviceId, isNew, parsed } = await deviceService.registerOrTouch({
      identityId: params.identityId,
      userAgent: params.userAgent,
    });

    const sessionOpaque = tokenService.issueOpaque();
    const refreshOpaque = tokenService.issueOpaque();

    const session = await sessionRepository.createSession({
      identityId: params.identityId,
      deviceId,
      sessionTokenHash: sessionOpaque.hash,
      userAgent: params.userAgent,
      deviceLabel: params.deviceLabel ?? parsed.name,
      ipAddress: params.ipAddress,
      browser: parsed.browser,
      os: parsed.os,
      platform: parsed.platform,
      deviceType: parsed.deviceType,
      expiresAt: lt.sessionExpiresAt,
      absoluteExpiresAt: lt.absoluteExpiresAt,
      rememberMe,
      creationSource: params.creationSource ?? "login",
      riskLevel: "UNKNOWN",
      refreshTokenHash: refreshOpaque.hash,
      refreshExpiresAt: lt.refreshExpiresAt,
    });

    const sessionVersion = await sessionRepository.getSessionVersion(
      params.identityId
    );
    const accessFinal = tokenService.issueAccessToken({
      identityId: params.identityId,
      sessionId: session.id,
      organizationId: params.organizationId,
      sessionVersion,
    });

    await sessionAuditService.record({
      identityId: params.identityId,
      sessionId: session.id,
      action: "created",
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      payload: {
        rememberMe,
        deviceId,
        isNewDevice: isNew,
        creationSource: params.creationSource ?? "login",
      },
    });

    if (isNew) {
      await sessionAuditService.record({
        identityId: params.identityId,
        sessionId: session.id,
        action: "device_registered",
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        payload: { deviceId },
      });
      await emitIdentityEvent({
        eventType: IDENTITY_EVENTS.SessionNewDevice,
        identityId: params.identityId,
        organizationId: params.organizationId,
        payload: { sessionId: session.id, deviceId },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
    }

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.SessionCreated,
      identityId: params.identityId,
      organizationId: params.organizationId,
      payload: {
        sessionId: session.id,
        rememberMe,
        deviceId,
        riskLevel: "UNKNOWN",
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      sessionId: session.id,
      sessionToken: sessionOpaque.token,
      refreshToken: refreshOpaque.token,
      accessToken: accessFinal.token,
      accessExpiresAt: accessFinal.expiresAt,
      sessionExpiresAt: lt.sessionExpiresAt,
      refreshExpiresAt: lt.refreshExpiresAt,
      sessionMaxAgeSeconds: lt.sessionMaxAgeSeconds,
      refreshMaxAgeSeconds: lt.refreshMaxAgeSeconds,
      accessMaxAgeSeconds: lt.accessMaxAgeSeconds,
      deviceId,
    };
  }

  async findActiveBySessionToken(sessionToken: string) {
    const hash = tokenService.hash(sessionToken);
    const session = await sessionRepository.findBySessionTokenHash(hash);
    if (!session) return null;
    if (session.revokedAt || session.archivedAt) return null;
    if (this.isSessionTimedOut(session)) {
      await this.revokeSession(session.id, "idle_or_absolute_timeout", {
        identityId: session.identityId,
      });
      return null;
    }
    return session;
  }

  isSessionTimedOut(session: {
    lastActivityAt: Date;
    expiresAt: Date;
    absoluteExpiresAt?: Date | null;
  }): boolean {
    if (session.expiresAt <= new Date()) return true;
    if (
      session.absoluteExpiresAt &&
      session.absoluteExpiresAt <= new Date()
    ) {
      return true;
    }
    return sessionPolicyService.isIdleExpired(
      session.lastActivityAt,
      session.absoluteExpiresAt
    );
  }

  async rotateRefreshToken(params: {
    refreshToken: string;
    organizationId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<RefreshResult> {
    const { prisma } = await import("@/lib/prisma");
    const hash = tokenService.hash(params.refreshToken);
    const existing = await prisma.iamRefreshToken.findUnique({
      where: { tokenHash: hash },
      include: { session: true },
    });

    if (!existing) {
      throw new IdentityError(
        "Invalid refresh token",
        401,
        "INVALID_REFRESH_TOKEN"
      );
    }

    if (existing.rotatedAt || existing.revokedAt) {
      await this.revokeSession(existing.sessionId, "refresh_token_reuse", {
        identityId: existing.identityId,
      });
      throw new IdentityError(
        "Refresh token reuse detected; session revoked",
        401,
        "REFRESH_TOKEN_REUSE"
      );
    }

    if (existing.expiresAt <= new Date()) {
      throw new IdentityError(
        "Refresh token expired",
        401,
        "REFRESH_TOKEN_EXPIRED"
      );
    }

    const session = existing.session;
    if (session.revokedAt || this.isSessionTimedOut(session)) {
      throw new IdentityError("Session is not active", 401, "SESSION_INACTIVE");
    }

    const lt = sessionPolicyService.lifetimes(session.rememberMe);
    const newOpaque = tokenService.issueOpaque();
    // Idle-aware expiry: min of absolute and idle window
    const idleExp = sessionPolicyService.idleExpiresAt(new Date());
    const nextExpires =
      session.absoluteExpiresAt && session.absoluteExpiresAt < idleExp
        ? session.absoluteExpiresAt
        : idleExp;

    await prisma.$transaction(async (tx) => {
      const created = await tx.iamRefreshToken.create({
        data: {
          sessionId: session.id,
          identityId: existing.identityId,
          tokenHash: newOpaque.hash,
          expiresAt: lt.refreshExpiresAt,
        },
      });
      await tx.iamRefreshToken.update({
        where: { id: existing.id },
        data: {
          rotatedAt: new Date(),
          revokedAt: new Date(),
          replacedBy: created.id,
        },
      });
      await tx.iamSession.update({
        where: { id: session.id },
        data: {
          lastActivityAt: new Date(),
          expiresAt: nextExpires,
        },
      });
    });

    const sessionVersion = await sessionRepository.getSessionVersion(
      existing.identityId
    );
    const access = tokenService.issueAccessToken({
      identityId: existing.identityId,
      sessionId: session.id,
      organizationId: params.organizationId,
      sessionVersion,
    });

    await sessionAuditService.record({
      identityId: existing.identityId,
      sessionId: session.id,
      action: "refreshed",
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      payload: { previousRefreshTokenId: existing.id },
    });

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.SessionRefreshed,
      identityId: existing.identityId,
      organizationId: params.organizationId,
      payload: { sessionId: session.id },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      sessionId: session.id,
      identityId: existing.identityId,
      organizationId: params.organizationId ?? null,
      refreshToken: newOpaque.token,
      accessToken: access.token,
      accessExpiresAt: access.expiresAt,
      sessionExpiresAt: nextExpires,
      refreshExpiresAt: lt.refreshExpiresAt,
      sessionMaxAgeSeconds: lt.sessionMaxAgeSeconds,
      refreshMaxAgeSeconds: lt.refreshMaxAgeSeconds,
      accessMaxAgeSeconds: lt.accessMaxAgeSeconds,
    };
  }

  async revokeSession(
    sessionId: string,
    reason = "logout",
    meta?: {
      identityId?: string;
      organizationId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
    }
  ): Promise<void> {
    const { prisma } = await import("@/lib/prisma");
    const session = await prisma.iamSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.revokedAt) return;

    await sessionRepository.revoke(sessionId, reason);

    const identityId = meta?.identityId ?? session.identityId;
    const auditAction =
      reason === "idle_or_absolute_timeout" || reason === "idle_timeout"
        ? "idle_timeout"
        : reason === "expired"
          ? "expired"
          : "revoked";

    await sessionAuditService.record({
      identityId,
      sessionId,
      action: auditAction,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      payload: { reason },
    });

    await emitIdentityEvent({
      eventType:
        auditAction === "expired" || auditAction === "idle_timeout"
          ? IDENTITY_EVENTS.SessionExpired
          : IDENTITY_EVENTS.SessionRevoked,
      identityId,
      organizationId: meta?.organizationId,
      payload: { sessionId, reason },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  }

  async revokeAllSessions(
    identityId: string,
    reason = "logout_all",
    exceptSessionId?: string
  ): Promise<number> {
    const { prisma } = await import("@/lib/prisma");
    const sessions = await prisma.iamSession.findMany({
      where: {
        identityId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
    });
    for (const s of sessions) {
      await this.revokeSession(s.id, reason, { identityId });
    }
    return sessions.length;
  }

  /**
   * Logout all devices — bumps sessionVersion, revokes sessions per policy.
   */
  async logoutAll(params: {
    identityId: string;
    currentSessionId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    forceAll?: boolean;
  }): Promise<{ revoked: number; sessionVersion: number; keptCurrent: boolean }> {
    const p = sessionPolicyService.getPolicy();
    const keepCurrent =
      !params.forceAll &&
      p.logoutAllKeepCurrent &&
      !!params.currentSessionId;

    const sessionVersion =
      await sessionRepository.incrementSessionVersion(params.identityId);

    const revoked = await this.revokeAllSessions(
      params.identityId,
      "logout_all",
      keepCurrent ? params.currentSessionId! : undefined
    );

    await sessionAuditService.record({
      identityId: params.identityId,
      sessionId: params.currentSessionId,
      action: "logout_all",
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      payload: { revoked, keepCurrent, sessionVersion },
    });

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.SessionLogoutAll,
      identityId: params.identityId,
      payload: { revoked, keepCurrent, sessionVersion },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return { revoked, sessionVersion, keptCurrent: keepCurrent };
  }

  async touchActivity(
    sessionId: string,
    meta?: { ipAddress?: string | null; path?: string | null }
  ): Promise<void> {
    const { prisma } = await import("@/lib/prisma");
    const session = await prisma.iamSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.revokedAt) return;

    const idleExp = sessionPolicyService.idleExpiresAt(new Date());
    const abs = session.absoluteExpiresAt;
    const nextExpires =
      abs && abs < idleExp ? abs : idleExp;

    await sessionRepository.touch(sessionId, nextExpires);
    if (meta) {
      void sessionAuditService.recordActivity({
        sessionId,
        kind: "heartbeat",
        ipAddress: meta.ipAddress,
        path: meta.path,
      });
    }
  }

  async listSessions(
    identityId: string,
    currentSessionId?: string | null
  ): Promise<SessionListItemDto[]> {
    const p = sessionPolicyService.getPolicy();
    const sessions = await sessionRepository.listForIdentity(identityId);
    return sessions.map((s) => this.toListItem(s, currentSessionId, p.exposeIpToUser));
  }

  async getSessionDetail(
    sessionId: string,
    identityId: string,
    currentSessionId?: string | null,
    options?: { admin?: boolean }
  ): Promise<SessionDetailDto> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new IdentityError("Session not found", 404, "SESSION_NOT_FOUND");
    }
    if (!options?.admin && session.identityId !== identityId) {
      throw new IdentityError("Session not found", 404, "SESSION_NOT_FOUND");
    }

    const p = sessionPolicyService.getPolicy();
    const base = this.toListItem(
      session,
      currentSessionId,
      options?.admin || p.exposeIpToUser
    );

    return {
      ...base,
      identityId: session.identityId,
      userAgent: session.userAgent,
      refreshHistory: (session.refreshTokens || []).map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        rotatedAt: r.rotatedAt?.toISOString() ?? null,
        revokedAt: r.revokedAt?.toISOString() ?? null,
        expiresAt: r.expiresAt.toISOString(),
        replacedBy: r.replacedBy,
      })),
      auditTrail: (session.audits || []).map((a) => ({
        id: a.id,
        action: a.action,
        ipAddress: a.ipAddress,
        userAgent: a.userAgent,
        payload: (a.payload as Record<string, unknown>) || {},
        createdAt: a.createdAt.toISOString(),
      })),
      deviceFull: session.device
        ? {
            id: session.device.id,
            name: session.device.name,
            browser: session.device.browser,
            os: session.device.os,
            platform: session.device.platform,
            deviceType: session.device.deviceType,
            trusted: false,
            firstSeenAt: session.device.firstSeenAt.toISOString(),
            lastSeenAt: session.device.lastSeenAt.toISOString(),
          }
        : null,
    };
  }

  async getSessionOwnedBy(sessionId: string, identityId: string) {
    const session = await sessionRepository.findById(sessionId);
    if (!session || session.identityId !== identityId) {
      throw new IdentityError("Session not found", 404, "SESSION_NOT_FOUND");
    }
    return session;
  }

  async adminSearch(params: {
    identityId?: string;
    email?: string;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  }) {
    return sessionRepository.adminSearch(params);
  }

  private toListItem(
    s: {
      id: string;
      userAgent: string | null;
      deviceLabel: string | null;
      ipAddress: string | null;
      browser?: string | null;
      os?: string | null;
      platform?: string | null;
      deviceType?: string | null;
      lastActivityAt: Date;
      expiresAt: Date;
      absoluteExpiresAt?: Date | null;
      createdAt: Date;
      rememberMe: boolean;
      revokedAt: Date | null;
      revokeReason: string | null;
      riskLevel?: string | null;
      creationSource?: string | null;
      deviceId?: string | null;
      device?: {
        id: string;
        name: string | null;
        browser: string | null;
        os: string | null;
        platform: string | null;
        deviceType: string;
        firstSeenAt: Date;
        lastSeenAt: Date;
      } | null;
    },
    currentSessionId?: string | null,
    exposeIp = true
  ): SessionListItemDto {
    const active =
      !s.revokedAt &&
      s.expiresAt > new Date() &&
      !this.isSessionTimedOut(s);
    return {
      id: s.id,
      device: {
        id: s.device?.id ?? s.deviceId ?? null,
        name: s.device?.name ?? s.deviceLabel,
        browser: s.device?.browser ?? s.browser ?? null,
        os: s.device?.os ?? s.os ?? null,
        platform: s.device?.platform ?? s.platform ?? null,
        deviceType: s.device?.deviceType ?? s.deviceType ?? null,
        trusted: false,
        firstSeenAt: s.device?.firstSeenAt?.toISOString() ?? null,
        lastSeenAt: s.device?.lastSeenAt?.toISOString() ?? null,
      },
      ipAddress: exposeIp ? s.ipAddress : null,
      createdAt: s.createdAt.toISOString(),
      lastActivityAt: s.lastActivityAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      absoluteExpiresAt: s.absoluteExpiresAt?.toISOString() ?? null,
      rememberMe: s.rememberMe,
      current: s.id === currentSessionId,
      trusted: false,
      revoked: !!s.revokedAt,
      revokeReason: s.revokeReason,
      riskLevel: s.riskLevel ?? "UNKNOWN",
      creationSource: s.creationSource ?? "login",
      active,
    };
  }
}

export const sessionService = new SessionService();
