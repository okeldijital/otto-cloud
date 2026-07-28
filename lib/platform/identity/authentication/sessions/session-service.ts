/**
 * SessionService — server-side sessions + refresh token rotation.
 *
 * Model: Identity → Session → Refresh Token → Access Token
 * Each session owns one active refresh token.
 * Presenting a rotated (already used) refresh token revokes the entire session.
 */

import { prisma } from "@/lib/prisma";
import { getPlatformConfig } from "@/lib/platform/config";
import { IdentityError } from "../../domain/types";
import { tokenService } from "../tokens/token-service";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../events";

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
  private sessionPolicy() {
    return getPlatformConfig().security.session;
  }

  private lifetimes(rememberMe: boolean) {
    const p = this.sessionPolicy();
    // Remember-me extends session + refresh within policy limits
    const sessionHours = rememberMe
      ? Math.min(p.rememberMeDays * 24, p.refreshTokenDays * 24)
      : p.maxAgeHours;
    const refreshDays = rememberMe
      ? Math.min(p.rememberMeDays, p.refreshTokenDays)
      : Math.max(1, Math.ceil(p.maxAgeHours / 24));
    const accessMinutes = p.accessTokenMinutes;

    const now = Date.now();
    return {
      sessionExpiresAt: new Date(now + sessionHours * 60 * 60 * 1000),
      refreshExpiresAt: new Date(now + refreshDays * 24 * 60 * 60 * 1000),
      sessionMaxAgeSeconds: Math.floor(sessionHours * 60 * 60),
      refreshMaxAgeSeconds: Math.floor(refreshDays * 24 * 60 * 60),
      accessMaxAgeSeconds: accessMinutes * 60,
    };
  }

  async createSession(params: {
    identityId: string;
    organizationId?: string | null;
    rememberMe?: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceLabel?: string | null;
  }): Promise<SessionCreateResult> {
    const rememberMe = params.rememberMe ?? false;
    const lt = this.lifetimes(rememberMe);

    const sessionOpaque = tokenService.issueOpaque();
    const refreshOpaque = tokenService.issueOpaque();

    const session = await prisma.iamSession.create({
      data: {
        identityId: params.identityId,
        sessionTokenHash: sessionOpaque.hash,
        userAgent: params.userAgent ?? null,
        deviceLabel: params.deviceLabel ?? null,
        ipAddress: params.ipAddress ?? null,
        expiresAt: lt.sessionExpiresAt,
        rememberMe,
        lastActivityAt: new Date(),
        refreshTokens: {
          create: {
            identityId: params.identityId,
            tokenHash: refreshOpaque.hash,
            expiresAt: lt.refreshExpiresAt,
          },
        },
      },
    });

    const identity = await prisma.iamIdentity.findUnique({
      where: { id: params.identityId },
      select: { sessionVersion: true },
    });

    // Re-issue access token with real session id + sessionVersion
    const accessFinal = tokenService.issueAccessToken({
      identityId: params.identityId,
      sessionId: session.id,
      organizationId: params.organizationId,
      sessionVersion: identity?.sessionVersion ?? 0,
    });

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.SessionCreated,
      identityId: params.identityId,
      organizationId: params.organizationId,
      payload: {
        sessionId: session.id,
        rememberMe,
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
    };
  }

  async findActiveBySessionToken(sessionToken: string) {
    const hash = tokenService.hash(sessionToken);
    const session = await prisma.iamSession.findUnique({
      where: { sessionTokenHash: hash },
      include: { identity: true },
    });
    if (!session) return null;
    if (session.revokedAt) return null;
    if (session.expiresAt <= new Date()) return null;
    return session;
  }

  /**
   * Rotate refresh token. If a rotated token is presented again → revoke session (reuse detection).
   */
  async rotateRefreshToken(params: {
    refreshToken: string;
    organizationId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<RefreshResult> {
    const hash = tokenService.hash(params.refreshToken);
    const existing = await prisma.iamRefreshToken.findUnique({
      where: { tokenHash: hash },
      include: { session: true },
    });

    if (!existing) {
      throw new IdentityError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    // Reuse detection: already rotated or revoked → kill session
    if (existing.rotatedAt || existing.revokedAt) {
      await this.revokeSession(existing.sessionId, "refresh_token_reuse");
      throw new IdentityError(
        "Refresh token reuse detected; session revoked",
        401,
        "REFRESH_TOKEN_REUSE"
      );
    }

    if (existing.expiresAt <= new Date()) {
      throw new IdentityError("Refresh token expired", 401, "REFRESH_TOKEN_EXPIRED");
    }

    const session = existing.session;
    if (session.revokedAt || session.expiresAt <= new Date()) {
      throw new IdentityError("Session is not active", 401, "SESSION_INACTIVE");
    }

    const rememberMe = session.rememberMe;
    const lt = this.lifetimes(rememberMe);
    const newOpaque = tokenService.issueOpaque();

    const newToken = await prisma.$transaction(async (tx) => {
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
          // Optionally extend session expiry on refresh within max
          expiresAt: lt.sessionExpiresAt,
        },
      });
      return created;
    });

    const identityRow = await prisma.iamIdentity.findUnique({
      where: { id: existing.identityId },
      select: { sessionVersion: true },
    });

    const access = tokenService.issueAccessToken({
      identityId: existing.identityId,
      sessionId: session.id,
      organizationId: params.organizationId,
      sessionVersion: identityRow?.sessionVersion ?? 0,
    });

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.SessionRefreshed,
      identityId: existing.identityId,
      organizationId: params.organizationId,
      payload: {
        sessionId: session.id,
        previousRefreshTokenId: existing.id,
        newRefreshTokenId: newToken.id,
      },
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
      sessionExpiresAt: lt.sessionExpiresAt,
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
    const session = await prisma.iamSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.revokedAt) return;

    await prisma.$transaction([
      prisma.iamSession.update({
        where: { id: sessionId },
        data: {
          revokedAt: new Date(),
          revokeReason: reason,
        },
      }),
      prisma.iamRefreshToken.updateMany({
        where: {
          sessionId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.SessionRevoked,
      identityId: meta?.identityId ?? session.identityId,
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

  async touchActivity(sessionId: string): Promise<void> {
    await prisma.iamSession.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });
  }

  /** A.3 — list sessions for an identity */
  async listSessions(identityId: string) {
    const sessions = await prisma.iamSession.findMany({
      where: { identityId },
      orderBy: { lastActivityAt: "desc" },
      take: 50,
    });
    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      deviceLabel: s.deviceLabel,
      ipAddress: s.ipAddress,
      lastActivityAt: s.lastActivityAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      rememberMe: s.rememberMe,
      revoked: !!s.revokedAt,
      revokeReason: s.revokeReason,
      active: !s.revokedAt && s.expiresAt > new Date(),
    }));
  }

  async getSessionOwnedBy(
    sessionId: string,
    identityId: string
  ) {
    const session = await prisma.iamSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.identityId !== identityId) {
      throw new IdentityError("Session not found", 404, "SESSION_NOT_FOUND");
    }
    return session;
  }
}

export const sessionService = new SessionService();
