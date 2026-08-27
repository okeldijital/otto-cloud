import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthentication, metaFromRequest } from "@/lib/platform/identity/authentication";

/** Temporary, read-only IAM/legacy migration diagnostic. Remove after migration state is verified. */
export async function GET(req: Request) {
  const stages: Record<string, unknown> = {};
  try {
    stages.authentication = "starting";
    const ctx = await requireAuthentication(req);
    stages.authentication = "ok";

    const requestedOrgId = metaFromRequest(req).organizationIdHint;
    const organizationId = requestedOrgId || ctx.organizationId;
    stages.organizationContext = organizationId ? "ok" : "missing";

    if (!organizationId) {
      return NextResponse.json({ ok: false, stages, error: "No organization context", code: "ORGANIZATION_REQUIRED" }, { status: 400 });
    }

    stages.organization = "starting";
    let organization;
    try {
      organization = await prisma.iamOrganization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, legacyTenantId: true, status: true },
      });
      stages.organization = organization ? "ok" : "not-found";
    } catch (error) {
      stages.organization = { status: "failed", error: error instanceof Error ? error.message : String(error) };
      return NextResponse.json({ ok: false, stages }, { status: 500 });
    }

    if (!organization) return NextResponse.json({ ok: false, stages, error: "IAM organization not found" }, { status: 404 });

    const safeCount = async (name: string, fn: () => Promise<number>) => {
      stages[name] = "starting";
      try {
        const value = await fn();
        stages[name] = { status: "ok", count: value };
        return value;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        stages[name] = { status: "failed", error: message };
        return null;
      }
    };

    const iamMemberships = await safeCount("iamMemberships", () => prisma.iamOrganizationMembership.count({ where: { organizationId } }));
    const iamRoles = await safeCount("iamRoles", () => prisma.iamRole.count({ where: { organizationId } }));
    const iamIdentitiesLinked = await safeCount("iamIdentitiesWithLegacyLink", () => prisma.iamIdentity.count({ where: { legacyUserId: { not: null } } }));

    let legacyTenantMemberships: Array<{ user_id: number; is_default: boolean | null }> = [];
    if (organization.legacyTenantId) {
      stages.legacyTenantMemberships = "starting";
      try {
        legacyTenantMemberships = await prisma.tenant_users.findMany({
          where: { tenant_id: organization.legacyTenantId },
          select: { user_id: true, is_default: true },
        });
        stages.legacyTenantMemberships = { status: "ok", count: legacyTenantMemberships.length };
      } catch (error) {
        stages.legacyTenantMemberships = { status: "failed", error: error instanceof Error ? error.message : String(error) };
      }
    } else {
      stages.legacyTenantMemberships = { status: "skipped", reason: "No legacyTenantId" };
    }

    let mappedLegacyUsers: number | null = null;
    const legacyUserIds = legacyTenantMemberships.map((row) => row.user_id);
    if (legacyUserIds.length) {
      mappedLegacyUsers = await safeCount("legacyUsersMappedToIam", () => prisma.iamIdentity.count({ where: { legacyUserId: { in: legacyUserIds } } }));
    } else {
      stages.legacyUsersMappedToIam = { status: "skipped", reason: "No legacy users returned" };
    }

    let roles: Array<{ key: string; name: string; isSystem: boolean }> = [];
    stages.roleDetails = "starting";
    try {
      roles = await prisma.iamRole.findMany({ where: { organizationId }, select: { key: true, name: true, isSystem: true }, orderBy: { key: "asc" } });
      stages.roleDetails = { status: "ok", count: roles.length };
    } catch (error) {
      stages.roleDetails = { status: "failed", error: error instanceof Error ? error.message : String(error) };
    }

    return NextResponse.json({
      ok: true,
      diagnostic: "iam-legacy-migration",
      request: { organizationId, contextOrganizationId: ctx.organizationId || null, contextIdentityId: ctx.identityId, headerOrganizationId: requestedOrgId || null },
      organization,
      counts: {
        legacyTenantMemberships: legacyTenantMemberships.length,
        legacyUsersReferencedByTenant: new Set(legacyUserIds).size,
        legacyUsersMappedToIam: mappedLegacyUsers,
        iamIdentitiesWithLegacyLink: iamIdentitiesLinked,
        iamOrganizationMemberships: iamMemberships,
        iamRoles,
        iamSystemRoles: roles.filter((role) => role.isSystem).length,
      },
      roles,
      stages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[iam diagnostic] failed", error);
    return NextResponse.json({ ok: false, stages, error: message, code: "DIAGNOSTIC_ERROR" }, { status: 500 });
  }
}
