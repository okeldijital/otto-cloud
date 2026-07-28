/**
 * Organization Context — single authoritative resolver for multi-org scope.
 *
 * All authenticated API routes, server actions, and RSC paths that need
 * organization scope MUST use this module. Do not read session.user.organization_id
 * or session.user.tenant_id directly for query filtering.
 *
 * @see docs/architecture/decisions/ADR-001-isolation-boundary.md
 * @see docs/architecture/multi-tenant-model.md
 */

import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getUserPermissions, getIdentityPermissions } from "@/lib/iam";
import {
  allowLegacyUserScope,
  getLegacyCatalogScopeId,
  getLegacyIntOrgId,
  isUnassignedUserOrganizationId,
  orgOwnsLegacyCatalog,
  resolveCatalogOrganizationId,
} from "@/lib/auth/migration-compat";

// ── Types ──────────────────────────────────────────────────────────────────

export type OrgContextSource = "membership" | "legacy-compat" | "superadmin";

export interface OrganizationSummary {
  id: string;
  name: string;
  display_name: string | null;
  logo_url: string | null;
  brand_color: string | null;
  org_type: string | null;
  is_active: boolean;
  owner_id: number | null;
}

export interface MembershipSummary {
  id: number;
  tenant_id: string;
  user_id: number;
  role_id: number | null;
  is_default: boolean;
}

export interface OrganizationContext {
  /** UUID used for UUID-scoped catalog filters (`organization_id`) */
  organizationId: string;
  /** Organization registry row (tenants table) when available */
  organization: OrganizationSummary | null;
  /**
   * Compat alias: same as the membership org id (tenants.id).
   * Prefer organizationId for catalog filters (may differ under legacy mapping).
   */
  tenantId: string | null;
  membership: MembershipSummary | null;
  role: string | null;
  permissions: string[];
  isSuperAdmin: boolean;
  userId: number;
  userEmail: string | null;
  /** Integer org id for legacy INT-scoped tables */
  legacyIntOrgId: number;
  dataScopeSource: OrgContextSource;
}

export class OrganizationContextError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "OrganizationContextError";
    this.status = status;
    this.code = code;
  }
}

// ── Session helpers ────────────────────────────────────────────────────────

type SessionLike = {
  user?: {
    id?: string;
    identityId?: string;
    email?: string | null;
    name?: string | null;
    organization_id?: string;
    tenant_id?: string | null;
    role?: string | null;
    is_superuser?: boolean | null;
    legacyUserId?: number | null;
    permissions?: string[];
  } | null;
};

function parseUserId(session: SessionLike): number | null {
  const legacy = session?.user?.legacyUserId;
  if (typeof legacy === "number" && !Number.isNaN(legacy)) return legacy;
  const raw = session?.user?.id;
  if (raw === undefined || raw === null) return null;
  // UUID identity ids are not numeric
  if (typeof raw === "string" && raw.includes("-")) return null;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return Number.isNaN(n) ? null : n;
}

function parseIdentityId(session: SessionLike): string | null {
  if (session?.user?.identityId) return session.user.identityId;
  const raw = session?.user?.id;
  if (typeof raw === "string" && raw.includes("-")) return raw;
  return null;
}

// ── Core resolver ──────────────────────────────────────────────────────────

/**
 * Resolve the full organization context for the current request.
 * Throws OrganizationContextError (401/403) on failure — never invents orgs.
 */
export async function getOrganizationContext(
  session?: SessionLike | null
): Promise<OrganizationContext> {
  const sess =
    session === undefined
      ? ((await getServerSession()) as SessionLike | null)
      : session;

  if (!sess?.user) {
    throw new OrganizationContextError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const identityId = parseIdentityId(sess);
  const userId = parseUserId(sess);

  // IAM-first path: org from iam_organizations when identity has membership
  if (identityId) {
    const iamCtx = await resolveIamOrganizationContext(sess, identityId, userId);
    if (iamCtx) return iamCtx;
  }

  if (userId === null) {
    throw new OrganizationContextError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const isSuperAdmin = !!sess.user.is_superuser;
  const sessionTenantId = sess.user.tenant_id || null;
  const rawSessionOrgId = sess.user.organization_id || null;
  const sessionOrgId =
    rawSessionOrgId && !isUnassignedUserOrganizationId(rawSessionOrgId)
      ? rawSessionOrgId
      : null;
  const role = sess.user.role ?? null;

  // Load memberships (legacy tenant_users)
  const memberships = await prisma.tenant_users.findMany({
    where: { user_id: userId },
    include: {
      tenants: {
        select: {
          id: true,
          name: true,
          display_name: true,
          logo_url: true,
          brand_color: true,
          org_type: true,
          is_active: true,
          owner_id: true,
        },
      },
    },
    orderBy: [{ is_default: "desc" }, { invited_at: "desc" }],
  });

  // Resolve active membership org id (tenants.id)
  let activeMembership =
    memberships.find((m) => sessionTenantId && m.tenant_id === sessionTenantId) ||
    memberships.find((m) => m.is_default) ||
    memberships[0] ||
    null;

  // Prefer session tenant if valid membership
  if (sessionTenantId) {
    const bySession = memberships.find((m) => m.tenant_id === sessionTenantId);
    if (bySession) activeMembership = bySession;
  }

  let membershipOrgId: string | null = activeMembership?.tenant_id ?? sessionTenantId;
  let organization: OrganizationSummary | null = activeMembership
    ? {
        id: activeMembership.tenants.id,
        name: activeMembership.tenants.name,
        display_name: activeMembership.tenants.display_name,
        logo_url: activeMembership.tenants.logo_url,
        brand_color: activeMembership.tenants.brand_color,
        org_type: activeMembership.tenants.org_type,
        is_active: activeMembership.tenants.is_active,
        owner_id: activeMembership.tenants.owner_id,
      }
    : null;

  // Superadmin without membership: may operate on session org if provided
  let dataScopeSource: OrgContextSource = "membership";
  let organizationId: string;

  if (activeMembership && membershipOrgId) {
    // Catalog scope may map to legacy UUID for imported data
    if (orgOwnsLegacyCatalog(membershipOrgId)) {
      organizationId = resolveCatalogOrganizationId(membershipOrgId);
      dataScopeSource = organizationId !== membershipOrgId ? "legacy-compat" : "membership";
    } else if (
      sessionOrgId &&
      allowLegacyUserScope({ userOrganizationId: sessionOrgId, isSuperAdmin })
    ) {
      // User still has legacy organization_id on their row; membership exists for a real tenant
      // Map: if env owners empty, use session org id when it is legacy scope
      organizationId = resolveCatalogOrganizationId(sessionOrgId);
      if (organizationId === getLegacyCatalogScopeId() && membershipOrgId !== organizationId) {
        dataScopeSource = "legacy-compat";
      } else {
        organizationId = resolveCatalogOrganizationId(membershipOrgId);
        dataScopeSource = "membership";
      }
    } else {
      organizationId = resolveCatalogOrganizationId(membershipOrgId);
      dataScopeSource = "membership";
    }
  } else if (
    allowLegacyUserScope({ userOrganizationId: sessionOrgId, isSuperAdmin }) &&
    sessionOrgId
  ) {
    // Pre-consolidation users: organization_id set to legacy catalog UUID, no tenant_users row
    organizationId = getLegacyCatalogScopeId();
    dataScopeSource = "legacy-compat";
    membershipOrgId = sessionOrgId;
  } else if (isSuperAdmin && sessionOrgId) {
    organizationId = resolveCatalogOrganizationId(sessionOrgId);
    dataScopeSource = "superadmin";
    if (!organization) {
      const t = await prisma.tenants.findUnique({
        where: { id: sessionTenantId || sessionOrgId },
        select: {
          id: true,
          name: true,
          display_name: true,
          logo_url: true,
          brand_color: true,
          org_type: true,
          is_active: true,
          owner_id: true,
        },
      });
      if (t) {
        organization = {
          id: t.id,
          name: t.name,
          display_name: t.display_name,
          logo_url: t.logo_url,
          brand_color: t.brand_color,
          org_type: t.org_type,
          is_active: t.is_active,
          owner_id: t.owner_id,
        };
        membershipOrgId = t.id;
      }
    }
  } else if (isSuperAdmin && !sessionOrgId) {
    // Superadmin with no active org: use legacy catalog so migrated data is visible
    organizationId = getLegacyCatalogScopeId();
    dataScopeSource = "superadmin";
  } else {
    throw new OrganizationContextError(
      "No organization membership. Accept an invitation or create an organization.",
      403,
      "NO_ORGANIZATION"
    );
  }

  // Permissions
  let permissions: string[] = [];
  try {
    const permSet = await getUserPermissions(userId);
    permissions = Array.from(permSet);
  } catch {
    permissions = [];
  }

  const membership: MembershipSummary | null = activeMembership
    ? {
        id: activeMembership.id,
        tenant_id: activeMembership.tenant_id,
        user_id: activeMembership.user_id,
        role_id: activeMembership.role_id,
        is_default: activeMembership.is_default,
      }
    : null;

  return {
    organizationId,
    organization,
    tenantId: membershipOrgId,
    membership,
    role,
    permissions,
    isSuperAdmin,
    userId,
    userEmail: sess.user.email ?? null,
    legacyIntOrgId: getLegacyIntOrgId(),
    dataScopeSource,
  };
}

/**
 * IAM organization path: use iam_organization_memberships when present.
 * Falls back to null so legacy tenant_users path can run.
 */
async function resolveIamOrganizationContext(
  sess: SessionLike,
  identityId: string,
  legacyUserId: number | null
): Promise<OrganizationContext | null> {
  const sessionOrgId = sess.user?.organization_id || null;
  const memberships = await prisma.iamOrganizationMembership.findMany({
    where: { identityId, status: "active" },
    include: {
      organization: true,
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (memberships.length === 0) {
    // Superadmin / IAM identity with permissions but no org membership
    if (sess.user?.is_superuser) {
      const organizationId =
        sessionOrgId && !isUnassignedUserOrganizationId(sessionOrgId)
          ? resolveCatalogOrganizationId(sessionOrgId)
          : getLegacyCatalogScopeId();
      return {
        organizationId,
        organization: null,
        tenantId: sessionOrgId,
        membership: null,
        role: sess.user.role ?? null,
        permissions: sess.user.permissions ?? [],
        isSuperAdmin: true,
        userId: legacyUserId ?? 0,
        userEmail: sess.user.email ?? null,
        legacyIntOrgId: getLegacyIntOrgId(),
        dataScopeSource: "superadmin",
      };
    }
    return null;
  }

  const active =
    memberships.find((m) => sessionOrgId && m.organizationId === sessionOrgId) ||
    memberships.find((m) => m.isDefault) ||
    memberships[0];

  const org = active.organization;
  // Prefer legacy tenant bridge for catalog scope
  let organizationId = org.legacyTenantId
    ? resolveCatalogOrganizationId(org.legacyTenantId)
    : org.id;
  if (org.legacyTenantId && orgOwnsLegacyCatalog(org.legacyTenantId)) {
    organizationId = resolveCatalogOrganizationId(org.legacyTenantId);
  }

  const permissions = active.role
    ? [
        ...new Set(
          active.role.permissions.map((rp) => rp.permission.key)
        ),
      ]
    : sess.user?.permissions ?? [];

  // Also merge legacy permissions when bridged
  if (legacyUserId != null) {
    try {
      const legacy = await getUserPermissions(legacyUserId);
      for (const p of legacy) permissions.push(p);
    } catch {
      /* ignore */
    }
  } else {
    try {
      const iamPerms = await getIdentityPermissions(identityId, org.id);
      for (const p of iamPerms) permissions.push(p);
    } catch {
      /* ignore */
    }
  }

  return {
    organizationId,
    organization: {
      id: org.legacyTenantId || org.id,
      name: org.name,
      display_name: org.name,
      logo_url: null,
      brand_color: null,
      org_type: null,
      is_active: org.status === "active",
      owner_id: null,
    },
    tenantId: org.legacyTenantId || org.id,
    membership: legacyUserId
      ? {
          id: 0,
          tenant_id: org.legacyTenantId || org.id,
          user_id: legacyUserId,
          role_id: null,
          is_default: active.isDefault,
        }
      : null,
    role: active.role?.key ?? sess.user?.role ?? null,
    permissions: [...new Set(permissions)],
    isSuperAdmin: !!sess.user?.is_superuser,
    userId: legacyUserId ?? 0,
    userEmail: sess.user?.email ?? null,
    legacyIntOrgId: getLegacyIntOrgId(),
    dataScopeSource: org.legacyTenantId ? "legacy-compat" : "membership",
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns context or null if unauthenticated / no org (does not throw).
 */
export async function getCurrentOrganization(
  session?: SessionLike | null
): Promise<OrganizationContext | null> {
  try {
    return await getOrganizationContext(session);
  } catch (e) {
    if (e instanceof OrganizationContextError) return null;
    throw e;
  }
}

/**
 * Returns organizationId (catalog scope UUID) or null.
 */
export async function getCurrentOrganizationId(
  session?: SessionLike | null
): Promise<string | null> {
  const ctx = await getCurrentOrganization(session);
  return ctx?.organizationId ?? null;
}

/**
 * Require a valid organization context. Throws OrganizationContextError.
 */
export async function requireOrganization(
  session?: SessionLike | null
): Promise<OrganizationContext> {
  return getOrganizationContext(session);
}

/**
 * Validate that the user is a member of the given organization (tenants.id).
 */
export async function validateMembership(
  userId: number,
  organizationId: string
): Promise<boolean> {
  if (!userId || !organizationId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { is_superuser: true },
  });
  if (user?.is_superuser) return true;

  const membership = await prisma.tenant_users.findUnique({
    where: {
      tenant_id_user_id: { tenant_id: organizationId, user_id: userId },
    },
  });
  return !!membership;
}

/**
 * NextResponse-friendly error helper for route handlers.
 */
export function orgContextErrorResponse(err: unknown): {
  body: { error: string; code?: string };
  status: number;
} {
  if (err instanceof OrganizationContextError) {
    return { body: { error: err.message, code: err.code }, status: err.status };
  }
  console.error("[organization-context]", err);
  return { body: { error: "Internal server error" }, status: 500 };
}

/**
 * Prisma where fragment for UUID-scoped models.
 */
export function orgWhere(
  ctx: OrganizationContext,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { organization_id: ctx.organizationId, ...extra };
}

/**
 * Prisma where fragment for INT-scoped legacy models.
 */
export function orgWhereInt(
  ctx: OrganizationContext,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { organization_id: ctx.legacyIntOrgId, ...extra };
}

/**
 * Soft-delete + org filter (list endpoints).
 */
export function orgWhereActive(
  ctx: OrganizationContext,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { organization_id: ctx.organizationId, is_deleted: false, ...extra };
}
