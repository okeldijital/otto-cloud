/**
 * SessionAuditService — durable session audit trail (A.3).
 */

import { prisma } from "@/lib/prisma";

export type SessionAuditAction =
  | "created"
  | "refreshed"
  | "revoked"
  | "expired"
  | "logout_all"
  | "idle_timeout"
  | "activity"
  | "device_registered"
  | "device_trusted"
  | "device_untrusted"
  | "device_revoked";

export class SessionAuditService {
  async record(params: {
    identityId: string;
    sessionId?: string | null;
    action: SessionAuditAction | string;
    ipAddress?: string | null;
    userAgent?: string | null;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await prisma.iamSessionAudit.create({
        data: {
          identityId: params.identityId,
          sessionId: params.sessionId ?? null,
          action: params.action,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          payload: (params.payload ?? {}) as object,
        },
      });
    } catch {
      /* non-blocking */
    }
  }

  async listForSession(sessionId: string, take = 50) {
    return prisma.iamSessionAudit.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async listForIdentity(identityId: string, take = 100) {
    return prisma.iamSessionAudit.findMany({
      where: { identityId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async recordActivity(params: {
    sessionId: string;
    kind?: string;
    ipAddress?: string | null;
    path?: string | null;
  }): Promise<void> {
    try {
      await prisma.iamSessionActivity.create({
        data: {
          sessionId: params.sessionId,
          kind: params.kind ?? "heartbeat",
          ipAddress: params.ipAddress ?? null,
          path: params.path ?? null,
        },
      });
    } catch {
      /* non-blocking */
    }
  }
}

export const sessionAuditService = new SessionAuditService();
