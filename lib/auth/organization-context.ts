/**
 * Organization Context — single authoritative resolver for multi-org scope.
 *
 * Authentication and organization membership are IAM-native. Legacy user and
 * tenant membership records are not consulted for identity or authorization.
 * Legacy catalog-scope mapping remains isolated in migration-compat.ts until
 * the imported catalog has been fully re-keyed.
 *
 * @see docs/architecture/decisions/ADR-001-isolation-boundary.md
 * @see docs/architecture/multi-tenant-model.md
 */

import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ensureLegacyActorForIdentity } from "@/lib/platform/identity/services/legacy-migration";
import {
  allowLegacyUserScope,
  getLegacyCatalogScopeId,
  getLegacyIntOrgId,
  orgOwnsLegacyCatalog,
  resolveCatalogOrganizationId,
} from "@/lib/auth/migration-compat";

export type OrgContextSource = "membership" | "superadmin";

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
  organizationId: string;
  organization: OrganizationSummary | null;
  tenantId: string | null;
  membership: MembershipSummary | null;
  role: string | null;
  permissions: string[];
  isSuperAdmin: boolean;
  /** Deprecated numeric compatibility field for legacy INT-scoped domain APIs. */
  userId: number;
  userEmail: string | null;
  /** Compatibility field for legacy INT-scoped domain tables; not used for auth. */
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
    permissions?: string[];
  } | null;
};

function parseIdentityId(session: SessionLike): string | null {
  return session?.user?.identityId ?? session?.user?.id ?? null;
}

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
  if (!identityId) {
    throw new OrganizationContextError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const identity = await prisma.iamIdentity.findUnique({
    where: { id: identityId },
    select: { legacyUserId: true },
  });

  if (!identity) {
    throw new OrganizationContextError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const legacyUserId =
    identity.legacyUserId ?? await ensureLegacyActorForIdentity(identityId);

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
    if (!sess.user.is_superuser) {
      throw new OrganizationContextError(
        "No organization membership. Accept an invitation or create an organization.",
        403,
        "NO_ORGANIZATION"
      );
    }

    const requestedOrg = sess.user.organization_id || sess.user.tenant_id || null;
    const organizationId = requestedOrg
      ? resolveCatalogOrganizationId(requestedOrg)
      : getLegacyCatalogScopeId();

    return {
      organizationId,
      organization: null,
      tenantId: requestedOrg,
      membership: null,
      role: sess.user.role ?? null,
      permissions: sess.user.permissions ?? [],
      isSuperAdmin: true,
      userId: legacyUserId,
      userEmail: sess.user.email ?? null,
      legacyIntOrgId: getLegacyIntOrgId(),
      dataScopeSource: "superadmin",
    };
  }

  const requestedOrg = sess.user.organization_id || sess.user.tenant_id || null;
  const active =
    memberships.find((m) => requestedOrg && m.organizationId === requestedOrg) ||
    memberships.find((m) => m.isDefault) ||
    memberships[0];

  const org = active.organization;
  const catalogOrganizationId = org.legacyTenantId
    ? resolveCatalogOrganizationId(org.legacyTenantId)
    : org.id;

  const permissions = active.role
    ? [...new Set(active.role.permissions.map((rp) => rp.permission.key))]
    : [...new Set(sess.user.permissions ?? [])];

  // Legacy users may have active IAM memberships while their catalog and
  // contract data still live under the legacy catalog scope. Keep IAM
  // authorization bound to `org`, but use the compatibility scope for
  // legacy-domain data access until the catalog is fully re-keyed.
  const usesLegacyCatalogScope = allowLegacyUserScope({
    userOrganizationId: sess.user.organization_id,
    isSuperAdmin: !!sess.user.is_superuser,
  });

  const organizationId = usesLegacyCatalogScope
    ? getLegacyCatalogScopeId()
    : org.legacyTenantId && orgOwnsLegacyCatalog(org.legacyTenantId)
      ? catalogOrganizationId
      : org.id;

  return {
    organizationId,
    organization: {
      id: org.id,
      name: org.name,
      display_name: org.name,
      logo_url: null,
      brand_color: null,
      org_type: null,
      is_active: org.status === "active",
      owner_id: null,
    },
    tenantId: org.id,
    membership: null,
    role: active.role?.key ?? sess.user.role ?? null,
    permissions,
    isSuperAdmin: !!sess.user.is_superuser,
    userId: legacyUserId,
    userEmail: sess.user.email ?? null,
    legacyIntOrgId: getLegacyIntOrgId(),
    dataScopeSource: "membership",
  };
}

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

export async function getCurrentOrganizationId(
  session?: SessionLike | null
): Promise<string | null> {
  const ctx = await getCurrentOrganization(session);
  return ctx?.organizationId ?? null;
}

export async function requireOrganization(
  session?: SessionLike | null
): Promise<OrganizationContext> {
  return getOrganizationContext(session);
}

/** Validate an authenticated IAM identity's active membership in an organization. */
export async function validateMembership(
  identityId: string,
  organizationId: string
): Promise<boolean> {
  if (!identityId || !organizationId) return false;
  const membership = await prisma.iamOrganizationMembership.findFirst({
    where: { identityId, organizationId, status: "active" },
    select: { id: true },
  });
  return !!membership;
}

export function orgContextErrorResponse(err: unknown): {
  body: { error: string; code?: string };
  status: number;
} {
  if (err instanceof OrganizationContextError) {
    return { body: { error: err.message, code: err.code } , status: err.status };
  }
  console.error("[organization-context]", err);
  return { body: { error: "Internal server error" }, status: 500 };
}

export function orgWhere(
  ctx: OrganizationContext,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { organization_id: ctx.organizationId, ...extra };
}

export function orgWhereInt(
  ctx: OrganizationContext,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { organization_id: ctx.legacyIntOrgId, ...extra };
}