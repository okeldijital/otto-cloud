/**
 * AuthenticationContext — single context object for authenticated requests (A.3).
 */

import type { CurrentIdentityContext } from "../current-identity-service";
import { currentIdentityService } from "../current-identity-service";
import { sessionPolicyService } from "../policies/SessionPolicyService";
import type { AuthenticationContextDto } from "../dto/SessionDto";
import { metaFromRequest, clientIp, clientUserAgent } from "../middleware";
import { prisma } from "@/lib/prisma";

export type AuthenticationContext = AuthenticationContextDto & {
  raw: CurrentIdentityContext;
};

export async function buildAuthenticationContext(
  req: Request
): Promise<AuthenticationContext | null> {
  const meta = metaFromRequest(req);
  const ctx = await currentIdentityService.resolveFromRequest(meta);
  if (!ctx) return null;

  let device = null;
  const session = await prisma.iamSession.findUnique({
    where: { id: ctx.sessionId },
    include: { device: true },
  });
  if (session?.device) {
    device = {
      id: session.device.id,
      name: session.device.name,
      browser: session.device.browser,
      os: session.device.os,
      platform: session.device.platform,
      deviceType: session.device.deviceType,
      trusted: false,
      firstSeenAt: session.device.firstSeenAt.toISOString(),
      lastSeenAt: session.device.lastSeenAt.toISOString(),
    };
  }

  const p = sessionPolicyService.getPolicy();

  return {
    identity: {
      id: ctx.identityId,
      email: ctx.email,
      displayName: ctx.displayName,
      emailVerified: ctx.emailVerified,
      status: ctx.status,
      sessionVersion: ctx.sessionVersion,
      mustChangePassword: ctx.mustChangePassword,
    },
    session: {
      id: ctx.sessionId,
      expiresAt: ctx.sessionExpiresAt.toISOString(),
      riskLevel: session?.riskLevel ?? "UNKNOWN",
      rememberMe: session?.rememberMe ?? false,
    },
    organization: ctx.organization,
    permissions: ctx.permissions,
    roles: ctx.roles,
    device,
    request: {
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    },
    policy: {
      idleTimeoutHours: p.idleTimeoutHours,
      maxAgeHours: p.maxAgeHours,
      accessTokenMinutes: p.accessTokenMinutes,
    },
    raw: ctx,
  };
}

export async function requireAuthenticationContext(
  req: Request
): Promise<AuthenticationContext> {
  const ctx = await buildAuthenticationContext(req);
  if (!ctx) {
    const { IdentityError } = await import("../../domain/types");
    throw new IdentityError("Authentication required", 401, "UNAUTHENTICATED");
  }
  return ctx;
}
