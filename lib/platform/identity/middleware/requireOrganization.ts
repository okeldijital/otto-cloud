/**
 * A.5 middleware re-exports + membership/owner helpers.
 * Prefer importing from @/lib/platform/identity.
 */

import { IdentityError } from "../domain/types";
import {
  requireActiveSession,
  requireAuthentication,
  requirePermission as baseRequirePermission,
  requireOrganization as baseRequireOrganization,
  requireEmailVerification,
  metaFromRequest,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
} from "../authentication/middleware";
import type { CurrentIdentityContext } from "../authentication/current-identity-service";
import { membershipRepository } from "../repositories/MembershipRepository";
import { authorizationService } from "../authorization/AuthorizationService";
import { permissionResolver } from "../authorization/PermissionResolver";

export {
  requireAuthentication,
  requireActiveSession,
  requireEmailVerification,
  baseRequireOrganization as requireOrganization,
  identityErrorResponse,
  metaFromRequest,
  clientIp,
  clientUserAgent,
};

export async function requireMembership(
  req: Request
): Promise<
  CurrentIdentityContext & {
    organizationId: string;
    membershipId: string;
  }
> {
  const ctx = await baseRequireOrganization(req);
  const membership = await membershipRepository.find(
    ctx.identityId,
    ctx.organizationId
  );
  if (!membership || membership.status !== "active") {
    throw new IdentityError(
      "Active membership required",
      403,
      "MEMBERSHIP_REQUIRED"
    );
  }
  return {
    ...ctx,
    organizationId: ctx.organizationId,
    membershipId: membership.id,
  };
}

export async function requirePermission(
  req: Request,
  permission: string | string[]
): Promise<CurrentIdentityContext> {
  const ctx = await requireActiveSession(req);
  if (ctx.isSuperAdmin) return ctx;

  if (ctx.organizationId) {
    const resolved = await permissionResolver.resolve(
      ctx.identityId,
      ctx.organizationId
    );
    authorizationService.authorize(
      {
        identityId: ctx.identityId,
        organizationId: ctx.organizationId,
        permissions: resolved.permissions,
        permissionSet: resolved.permissionSet,
        isOwner: resolved.isOwner,
        isSuperAdmin: ctx.isSuperAdmin,
      },
      permission
    );
    return {
      ...ctx,
      permissions: resolved.permissions,
      roles: resolved.roles,
      permissionSet: resolved.permissionSet,
    };
  }

  return baseRequirePermission(req, permission);
}

export async function requireOrganizationOwner(
  req: Request
): Promise<CurrentIdentityContext & { organizationId: string }> {
  const ctx = await requireMembership(req);
  if (ctx.isSuperAdmin) return ctx;
  const membership = await membershipRepository.find(
    ctx.identityId,
    ctx.organizationId
  );
  if (!membership?.isOwner) {
    // fallback: organizations.manage
    try {
      await requirePermission(req, "organizations.manage");
      return ctx;
    } catch {
      throw new IdentityError(
        "Organization owner required",
        403,
        "OWNER_REQUIRED"
      );
    }
  }
  return ctx;
}
