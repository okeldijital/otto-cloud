import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthentication, metaFromRequest } from "@/lib/platform/identity/authentication";

/**
 * Temporary, read-only IAM/legacy migration diagnostic.
 * Remove after the migration state has been verified.
 * No PII is returned.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const requestedOrgId = metaFromRequest(req).organizationIdHint;
    const organizationId = requestedOrgId || ctx.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization context", code: "ORGANIZATION_REQUIRED" },
        { status: 400 }
      );
    }

    const organization = await prisma.iamOrganization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        legacyTenantId: true,
        status: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "IAM organization not found", organizationId },
        { status: 404 }
      );
    }

    const [iamMemberships, iamRoles, iamIdentitiesLinked, legacyTenantMemberships] = await Promise.all([
      prisma.iamOrganizationMembership.count({ where: { organizationId } }),
      prisma.iamRole.count({ where: { organizationId } }),
      prisma.iamIdentity.count({ where: { legacyUserId: { not: null } } }),
      organization.legacyTenantId
        ? prisma.tenant_users.findMany({
            where: { tenant_id: organization.legacyTenantId },
            select: { user_id: true, is_default: true },
          })
        : Promise.resolve([]),
    ]);

    const legacyUserIds = legacyTenantMemberships.map((row) => row.user_id);
    const mappedLegacyUsers = legacyUserIds.length
      ? await prisma.iamIdentity.count({ where: { legacyUserId: { in: legacyUserIds } } })
      : 0;

    const roles = await prisma.iamRole.findMany({
      where: { organizationId },
      select: { key: true, name: true, isSystem: true },
      orderBy: { key: "asc" },
    });

    return NextResponse.json({
      ok: true,
      diagnostic: "iam-legacy-migration",
      database: {
        runtime: process.env.VERCEL_ENV || "local",
        nodeEnv: process.env.NODE_ENV || "unknown",
      },
      request: {
        organizationId,
        contextOrganizationId: ctx.organizationId || null,
        contextIdentityId: ctx.identityId,
        headerOrganizationId: requestedOrgId || null,
      },
      organization,
      counts: {
        legacyTenantMemberships: legacyTenantMemberships.length,
        legacyUsersReferencedByTenant: new Set(legacyUserIds).size,
        legacyUsersMappedToIam: mappedLegacyUsers,
        iamIdentitiesWithLegacyLink: iamIdentitiesLinked,
        iamOrganizationMemberships: iamMemberships,
        iamRoles: iamRoles,
        iamSystemRoles: roles.filter((role) => role.isSystem).length,
      },
      roles,
    });
  } catch (error) {
    console.error("[iam diagnostic] failed", error);
    return NextResponse.json(
      { error: "Diagnostic failed", code: "DIAGNOSTIC_ERROR" },
      { status: 500 }
    );
  }
}
