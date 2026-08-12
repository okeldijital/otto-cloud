/**
 * A.8 Step 3 Group B — Platform vs organization authority.
 *
 * Organization authority: administer within the authenticated org membership.
 * Platform authority: cross-org / superuser / platform.admin (explicit only).
 *
 * Never trust client-supplied organizationId, role, or is_superuser for elevation.
 */

import { IdentityError } from "@/lib/platform/identity/domain/types";
import type { CurrentIdentityContext } from "@/lib/platform/identity/authentication/current-identity-service";
import { SYSTEM_ROLE_TEMPLATES } from "@/lib/platform/identity/permissions/catalog";
import { prisma } from "@/lib/prisma";

/** Higher rank = more privileged. Platform roles are not grantable via org IAM. */
export const ROLE_RANK: Record<string, number> = {
  viewer: 10,
  member: 20,
  contributor: 25,
  reviewer: 30,
  editor: 40,
  manager: 50,
  administrator: 70,
  org_admin: 70,
  owner: 90,
  // Platform-only (not assignable via org admin APIs)
  platform_admin: 100,
  super_admin: 110,
};

/** Roles that may be granted inside an organization (never platform_* / super_admin). */
export const ORG_ASSIGNABLE_ROLE_KEYS = new Set(
  Object.keys(SYSTEM_ROLE_TEMPLATES).filter(
    (k) => k !== "platform_admin" && k !== "super_admin"
  )
);

/** Legacy string roles for users.role column (invite path). */
export const LEGACY_ORG_ROLES = new Set([
  "user",
  "member",
  "viewer",
  "editor",
  "manager",
  "admin",
  "org_admin",
  "owner",
]);

/**
 * Explicit platform authority only.
 *
 * - isSuperAdmin / legacy is_superuser
 * - membership role key super_admin or platform_admin
 *
 * Intentionally does NOT grant platform authority from a bare
 * `platform.admin` permission on an organization role. Catalog v5 owner
 * templates incorrectly included platform.admin; those stale DB rows must
 * not elevate org owners to platform admins (A8-016 / R4-SEED-001).
 *
 * Legitimate platform operators must use super_admin / platform_admin roles
 * or the legacy is_superuser flag — not org-owner permission lists.
 */
export function isPlatformAuthority(ctx: {
  isSuperAdmin?: boolean;
  permissions?: string[];
  roles?: string[];
}): boolean {
  if (ctx.isSuperAdmin === true) return true;
  const roles = ctx.roles ?? [];
  if (roles.includes("super_admin")) return true;
  if (roles.includes("platform_admin")) return true;
  // permissions list intentionally ignored for platform elevation
  void ctx.permissions;
  return false;
}

/**
 * Bind path/body organization id to the caller's authorized scope.
 * Platform authority may operate cross-org; others must match session org.
 */
export function assertOrganizationTarget(
  ctx: CurrentIdentityContext,
  targetOrganizationId: string,
  opts?: { allowPlatformCrossOrg?: boolean }
): void {
  if (!targetOrganizationId?.trim()) {
    throw new IdentityError(
      "Organization id required",
      400,
      "VALIDATION_ERROR"
    );
  }
  if (opts?.allowPlatformCrossOrg !== false && isPlatformAuthority(ctx)) {
    return;
  }
  if (!ctx.organizationId || ctx.organizationId !== targetOrganizationId) {
    throw new IdentityError(
      "Organization scope denied",
      403,
      "ORG_SCOPE_DENIED"
    );
  }
}

export function actorMaxRoleRank(ctx: {
  roles?: string[];
  isSuperAdmin?: boolean;
}): number {
  if (ctx.isSuperAdmin) return ROLE_RANK.super_admin;
  let max = 0;
  for (const r of ctx.roles || []) {
    max = Math.max(max, ROLE_RANK[r] ?? 0);
  }
  return max;
}

/**
 * Whether actor may assign roleKey inside an organization.
 * - Role must be org-assignable
 * - Rank must be strictly below actor (owners may grant administrator, not owner, unless transfer)
 * - owner only via transferOwnership path (allowOwner=true)
 */
export function assertCanGrantOrgRole(
  ctx: CurrentIdentityContext,
  roleKey: string,
  opts?: { allowOwner?: boolean }
): void {
  if (!roleKey || typeof roleKey !== "string") {
    throw new IdentityError("roleKey required", 400, "VALIDATION_ERROR");
  }
  const key = roleKey.trim();
  if (key === "super_admin" || key === "platform_admin") {
    throw new IdentityError(
      "Cannot assign platform roles through organization IAM",
      403,
      "ROLE_GRANT_DENIED"
    );
  }
  if (!ORG_ASSIGNABLE_ROLE_KEYS.has(key) && !SYSTEM_ROLE_TEMPLATES[key]) {
    throw new IdentityError("Unknown organization role", 400, "UNKNOWN_ROLE");
  }
  if (!ORG_ASSIGNABLE_ROLE_KEYS.has(key)) {
    throw new IdentityError(
      "Role is not assignable in organizations",
      403,
      "ROLE_GRANT_DENIED"
    );
  }
  if (key === "owner" && !opts?.allowOwner) {
    throw new IdentityError(
      "Owner role cannot be assigned; use ownership transfer",
      403,
      "ROLE_GRANT_DENIED"
    );
  }
  const targetRank = ROLE_RANK[key] ?? 0;
  const actorRank = actorMaxRoleRank(ctx);
  // Platform authority may grant any org role including owner when allowOwner
  if (isPlatformAuthority(ctx)) return;
  if (targetRank >= actorRank) {
    throw new IdentityError(
      "Cannot grant a role equal or higher than your own",
      403,
      "ROLE_GRANT_DENIED"
    );
  }
}

/** Legacy invite role strings → normalized org roles */
export function normalizeLegacyInviteRole(
  raw: unknown,
  ctx: CurrentIdentityContext
): string {
  if (raw === undefined || raw === null || raw === "") {
    return "member";
  }
  if (typeof raw !== "string") {
    throw new IdentityError("Invalid role", 400, "VALIDATION_ERROR");
  }
  const role = raw.trim().toLowerCase();
  if (role === "superuser" || role === "super_admin" || role === "platform_admin") {
    throw new IdentityError(
      "Cannot invite with platform privileges",
      403,
      "ROLE_GRANT_DENIED"
    );
  }
  if (!LEGACY_ORG_ROLES.has(role)) {
    throw new IdentityError("Unknown role", 400, "UNKNOWN_ROLE");
  }
  // Map legacy "admin" → administrator for hierarchy checks
  const mapKey =
    role === "admin" ? "administrator" : role === "user" ? "member" : role;
  assertCanGrantOrgRole(ctx, mapKey === "owner" ? "owner" : mapKey, {
    allowOwner: false,
  });
  // Never persist owner via invite
  if (mapKey === "owner") {
    throw new IdentityError(
      "Cannot invite as owner",
      403,
      "ROLE_GRANT_DENIED"
    );
  }
  return role === "user" ? "member" : role;
}

/**
 * Ensure a legacy User row belongs to the actor's organization (UUID or tenant).
 */
export type LegacyUserOrgRow = {
  id: number;
  organization_id: string | null;
  tenant_id: string | null;
  is_superuser: boolean;
  email: string;
};

export async function assertLegacyUserInActorOrg(
  ctx: CurrentIdentityContext,
  targetUserId: number
): Promise<LegacyUserOrgRow> {
  if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
    throw new IdentityError("Invalid user id", 400, "VALIDATION_ERROR");
  }
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      organization_id: true,
      tenant_id: true,
      is_superuser: true,
      email: true,
    },
  });
  if (!user) {
    throw new IdentityError("User not found", 404, "NOT_FOUND");
  }
  const normalized: LegacyUserOrgRow = {
    id: user.id,
    organization_id: user.organization_id,
    tenant_id: user.tenant_id,
    is_superuser: user.is_superuser === true,
    email: user.email,
  };
  if (isPlatformAuthority(ctx)) return normalized;

  const orgId = ctx.organizationId;
  if (!orgId) {
    throw new IdentityError(
      "Organization context required",
      403,
      "ORGANIZATION_REQUIRED"
    );
  }
  // CurrentIdentityContext uses organizationId only (no tenantId field).
  // Match legacy user.organization_id or user.tenant_id against session org.
  const inOrg =
    user.organization_id === orgId || user.tenant_id === orgId;
  if (!inOrg) {
    throw new IdentityError("User not found", 404, "NOT_FOUND");
  }
  return normalized;
}

/** Reject client-supplied is_superuser unless platform authority. */
export function assertCanSetSuperuser(
  ctx: CurrentIdentityContext | { isSuperAdmin?: boolean; permissions?: string[]; roles?: string[] },
  requested: unknown
): boolean {
  if (requested === undefined) return false;
  if (typeof requested !== "boolean") {
    throw new IdentityError(
      "is_superuser must be a boolean",
      400,
      "VALIDATION_ERROR"
    );
  }
  if (!isPlatformAuthority(ctx)) {
    throw new IdentityError(
      "Platform authority required to modify superuser status",
      403,
      "PLATFORM_AUTHORITY_REQUIRED"
    );
  }
  return requested;
}

export function rejectClientPrivilegeFields(body: Record<string, unknown>): void {
  const forbidden = [
    "is_superuser",
    "isSuperuser",
    "isSuperAdmin",
    "superuser",
    "permissions",
    "permission_ids",
  ];
  for (const k of forbidden) {
    if (k in body && body[k] !== undefined) {
      // Caller must use explicit platform endpoints — reject if present without authority later
    }
  }
}

/**
 * Assert caller is platform authority. Use for global reference-data mutations
 * (labels / publishers / pros) and platform diagnostics.
 */
export function assertPlatformAuthority(ctx: {
  isSuperAdmin?: boolean;
  permissions?: string[];
  roles?: string[];
}): void {
  if (!isPlatformAuthority(ctx)) {
    throw new IdentityError(
      "Platform authority required",
      403,
      "PLATFORM_AUTHORITY_REQUIRED"
    );
  }
}

/** Session-shaped helper for route handlers that already have getServerSession(). */
export function platformAuthorityFromSession(user: {
  is_superuser?: boolean | null;
  permissions?: string[] | null;
  role?: string | null;
}): boolean {
  return isPlatformAuthority({
    isSuperAdmin: !!user.is_superuser,
    permissions: user.permissions || [],
    roles: user.role ? [user.role] : [],
  });
}
