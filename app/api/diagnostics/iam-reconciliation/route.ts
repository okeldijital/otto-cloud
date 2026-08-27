import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Temporary read-only reconciliation diagnostic. Remove after IAM migration state is verified. */
export async function GET() {
  try {
    const [legacyUsers, iamIdentities, organizations, memberships, roles] = await Promise.all([
      prisma.user.findMany({ select: { id: true, email: true, is_active: true } }),
      prisma.iamIdentity.findMany({ select: { id: true, email: true, emailNormalized: true, legacyUserId: true, status: true } }),
      prisma.iamOrganization.findMany({ select: { id: true, name: true, legacyTenantId: true, ownerIdentityId: true } }),
      prisma.iamOrganizationMembership.findMany({ select: { identityId: true, organizationId: true, roleId: true, status: true, isDefault: true, isOwner: true } }),
      prisma.iamRole.findMany({ select: { id: true, organizationId: true, key: true, name: true, isSystem: true } }),
    ]);

    const normalize = (value: string) => value.trim().toLowerCase();
    const legacyByEmail = new Map(legacyUsers.map((u) => [normalize(u.email), u]));
    const iamByEmail = new Map(iamIdentities.map((i) => [normalize(i.email), i]));

    const emailMatches = iamIdentities.filter((identity) => legacyByEmail.has(normalize(identity.email)));
    const linked = iamIdentities.filter((identity) => identity.legacyUserId !== null);
    const legacyUsersWithIamEmailMatch = legacyUsers.filter((user) => iamByEmail.has(normalize(user.email)));
    const activeLegacyUsersWithoutEmailMatch = legacyUsers.filter((user) => user.is_active && !iamByEmail.has(normalize(user.email)));

    const orgSummaries = organizations.map((org) => ({
      id: org.id,
      name: org.name,
      legacyTenantId: org.legacyTenantId,
      ownerIdentityId: org.ownerIdentityId,
      membershipCount: memberships.filter((m) => m.organizationId === org.id).length,
      roleCount: roles.filter((r) => r.organizationId === org.id).length,
      systemRoleCount: roles.filter((r) => r.organizationId === org.id && r.isSystem).length,
    }));

    return NextResponse.json({
      ok: true,
      diagnostic: "iam-reconciliation",
      counts: {
        legacyUsers: legacyUsers.length,
        activeLegacyUsers: legacyUsers.filter((u) => u.is_active).length,
        iamIdentities: iamIdentities.length,
        iamIdentitiesLinkedByLegacyUserId: linked.length,
        iamIdentitiesMatchingLegacyUserEmail: emailMatches.length,
        legacyUsersMatchingIamEmail: legacyUsersWithIamEmailMatch.length,
        activeLegacyUsersWithoutIamEmailMatch: activeLegacyUsersWithoutEmailMatch.length,
        organizations: organizations.length,
        organizationsWithLegacyTenantId: organizations.filter((o) => o.legacyTenantId !== null).length,
        memberships: memberships.length,
        activeMemberships: memberships.filter((m) => m.status === "active").length,
        owners: memberships.filter((m) => m.isOwner).length,
        roles: roles.length,
        systemRoles: roles.filter((r) => r.isSystem).length,
      },
      organizations: orgSummaries,
      membershipRoleKeys: roles.map((r) => ({ organizationId: r.organizationId, key: r.key, isSystem: r.isSystem })),
    });
  } catch (error) {
    console.error("[iam reconciliation] failed", error);
    return NextResponse.json({ ok: false, code: "IAM_RECONCILIATION_FAILED", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
