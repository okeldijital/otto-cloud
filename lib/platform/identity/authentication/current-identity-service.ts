/**
 * CurrentIdentityService — single resolution path for authenticated requests.
 *
 * Authentication → Session → Identity → Organization → Permissions → Request Context
 */

import { prisma } from "@/lib/prisma";
import { IdentityError } from "../domain/types";
import { PermissionSet } from "../authorization/permissions";
import { cookieService } from "./cookies/cookie-service";
import { sessionService } from "./sessions/session-service";
import { tokenService } from "./tokens/token-service";

export type CurrentIdentityContext = {
  identityId: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  status: string;
  sessionId: string;
  sessionExpiresAt: Date;
  organizationId: string | null;
  organization: {
    id: string;
    name: string;
    slug: string;
    status: string;
  } | null;
  roles: string[];
  permissions: string[];
  permissionSet: PermissionSet;
  isSuperAdmin: boolean;
  legacyUserId: number | null;
};

export class CurrentIdentityService {
  /**
   * Resolve from Cookie header (preferred) or Authorization Bearer access token.
   */
  async resolveFromRequest(params: {
    cookieHeader?: string | null;
    authorizationHeader?: string | null;
    organizationIdHint?: string | null;
  }): Promise<CurrentIdentityContext | null> {
    const cookies = cookieService.readFromRequest(params.cookieHeader ?? null);

    // Prefer short-lived access token when present
    let identityId: string | null = null;
    let sessionId: string | null = null;
    let orgFromToken: string | null = null;

    const accessToken =
      cookies.accessToken ||
      extractBearer(params.authorizationHeader ?? null);

    if (accessToken) {
      try {
        const claims = tokenService.verifyAccessToken(accessToken);
        identityId = claims.sub;
        sessionId = claims.sid;
        orgFromToken = claims.org ?? null;
      } catch {
        // Fall through to session cookie
      }
    }

    if ((!identityId || !sessionId) && cookies.sessionToken) {
      const session = await sessionService.findActiveBySessionToken(
        cookies.sessionToken
      );
      if (!session) return null;
      identityId = session.identityId;
      sessionId = session.id;
    }

    if (!identityId || !sessionId) return null;

    // Validate session still active (access token alone is not enough if revoked)
    const session = await prisma.iamSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return null;
    }
    if (session.identityId !== identityId) return null;

    const identity = await prisma.iamIdentity.findUnique({
      where: { id: identityId },
    });
    if (!identity) return null;
    if (identity.status === "disabled") return null;

    // Auto-unlock window handled at login; still block hard lock here
    if (
      identity.status === "locked" &&
      identity.lockedUntil &&
      identity.lockedUntil > new Date()
    ) {
      return null;
    }

    const orgId =
      params.organizationIdHint ||
      orgFromToken ||
      (await this.resolveDefaultOrganizationId(identityId));

    const membership = orgId
      ? await prisma.iamOrganizationMembership.findUnique({
          where: {
            identityId_organizationId: {
              identityId,
              organizationId: orgId,
            },
          },
          include: {
            organization: true,
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        })
      : null;

    if (membership && membership.status !== "active") {
      // Membership not usable — still return identity without org
    }

    const activeMembership =
      membership && membership.status === "active" ? membership : null;

    const roleKeys: string[] = [];
    const permKeys: string[] = [];
    if (activeMembership?.role) {
      roleKeys.push(activeMembership.role.key);
      for (const rp of activeMembership.role.permissions) {
        permKeys.push(rp.permission.key);
      }
    }

    // Super-admin: system role key or platform permission
    const isSuperAdmin =
      roleKeys.includes("super_admin") ||
      roleKeys.includes("platform_admin") ||
      permKeys.includes("platform.admin");

    // Touch activity (non-blocking best-effort)
    void sessionService.touchActivity(sessionId).catch(() => undefined);

    return {
      identityId: identity.id,
      email: identity.email,
      displayName: identity.displayName,
      emailVerified: !!identity.emailVerifiedAt,
      emailVerifiedAt: identity.emailVerifiedAt,
      status: identity.status,
      sessionId,
      sessionExpiresAt: session.expiresAt,
      organizationId: activeMembership?.organizationId ?? null,
      organization: activeMembership?.organization
        ? {
            id: activeMembership.organization.id,
            name: activeMembership.organization.name,
            slug: activeMembership.organization.slug,
            status: activeMembership.organization.status,
          }
        : null,
      roles: roleKeys,
      permissions: [...new Set(permKeys)],
      permissionSet: PermissionSet.from(permKeys),
      isSuperAdmin,
      legacyUserId: identity.legacyUserId,
    };
  }

  async requireFromRequest(params: {
    cookieHeader?: string | null;
    authorizationHeader?: string | null;
    organizationIdHint?: string | null;
  }): Promise<CurrentIdentityContext> {
    const ctx = await this.resolveFromRequest(params);
    if (!ctx) {
      throw new IdentityError("Authentication required", 401, "UNAUTHENTICATED");
    }
    return ctx;
  }

  private async resolveDefaultOrganizationId(
    identityId: string
  ): Promise<string | null> {
    const membership = await prisma.iamOrganizationMembership.findFirst({
      where: {
        identityId,
        status: "active",
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return membership?.organizationId ?? null;
  }
}

function extractBearer(header: string | null): string | undefined {
  if (!header) return undefined;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim();
}

export const currentIdentityService = new CurrentIdentityService();
