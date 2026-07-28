/**
 * OrganizationService (A.5) — org CRUD, memberships, role assignment.
 */

import { prisma } from "@/lib/prisma";
import { IdentityError } from "../domain/types";
import { seedOrgSystemRoles } from "../services/permission-seed";
import { normalizeEmail } from "../authentication/crypto/tokens";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export class OrganizationService {
  async createOrganization(params: {
    name: string;
    slug?: string;
    creatorIdentityId: string;
    legacyTenantId?: string | null;
  }) {
    const name = params.name?.trim();
    if (!name) {
      throw new IdentityError("Organization name required", 400, "VALIDATION_ERROR");
    }
    let slug = params.slug?.trim() || slugify(name);
    if (!slug) slug = `org-${Date.now()}`;

    const existing = await prisma.iamOrganization.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const org = await prisma.iamOrganization.create({
      data: {
        name,
        slug,
        status: "active",
        legacyTenantId: params.legacyTenantId ?? null,
      },
    });

    await seedOrgSystemRoles(org.id);

    const adminRole = await prisma.iamRole.findFirst({
      where: { organizationId: org.id, key: "org_admin" },
    });

    await prisma.iamOrganizationMembership.create({
      data: {
        identityId: params.creatorIdentityId,
        organizationId: org.id,
        roleId: adminRole?.id ?? null,
        status: "active",
        isDefault: true,
        joinedAt: new Date(),
      },
    });

    return org;
  }

  async listMemberships(identityId: string) {
    return prisma.iamOrganizationMembership.findMany({
      where: { identityId, status: "active" },
      include: {
        organization: true,
        role: true,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  }

  async listMembers(organizationId: string) {
    return prisma.iamOrganizationMembership.findMany({
      where: { organizationId, status: { not: "removed" } },
      include: {
        identity: {
          select: {
            id: true,
            email: true,
            displayName: true,
            status: true,
            emailVerifiedAt: true,
          },
        },
        role: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async addMember(params: {
    organizationId: string;
    identityId: string;
    roleKey?: string;
    isDefault?: boolean;
  }) {
    const role = params.roleKey
      ? await prisma.iamRole.findFirst({
          where: {
            organizationId: params.organizationId,
            key: params.roleKey,
          },
        })
      : await prisma.iamRole.findFirst({
          where: { organizationId: params.organizationId, key: "member" },
        });

    return prisma.iamOrganizationMembership.upsert({
      where: {
        identityId_organizationId: {
          identityId: params.identityId,
          organizationId: params.organizationId,
        },
      },
      create: {
        identityId: params.identityId,
        organizationId: params.organizationId,
        roleId: role?.id ?? null,
        status: "active",
        isDefault: params.isDefault ?? false,
        joinedAt: new Date(),
      },
      update: {
        roleId: role?.id ?? undefined,
        status: "active",
        joinedAt: new Date(),
      },
    });
  }

  async setMemberRole(params: {
    organizationId: string;
    identityId: string;
    roleKey: string;
  }) {
    const role = await prisma.iamRole.findFirst({
      where: {
        organizationId: params.organizationId,
        key: params.roleKey,
      },
    });
    if (!role) {
      throw new IdentityError("Role not found", 404, "ROLE_NOT_FOUND");
    }
    return prisma.iamOrganizationMembership.update({
      where: {
        identityId_organizationId: {
          identityId: params.identityId,
          organizationId: params.organizationId,
        },
      },
      data: { roleId: role.id },
    });
  }

  async removeMember(params: {
    organizationId: string;
    identityId: string;
  }) {
    return prisma.iamOrganizationMembership.update({
      where: {
        identityId_organizationId: {
          identityId: params.identityId,
          organizationId: params.organizationId,
        },
      },
      data: { status: "removed" },
    });
  }

  async setDefaultOrganization(params: {
    identityId: string;
    organizationId: string;
  }) {
    const membership = await prisma.iamOrganizationMembership.findUnique({
      where: {
        identityId_organizationId: {
          identityId: params.identityId,
          organizationId: params.organizationId,
        },
      },
    });
    if (!membership || membership.status !== "active") {
      throw new IdentityError(
        "Not a member of organization",
        403,
        "NOT_ORG_MEMBER"
      );
    }

    await prisma.$transaction([
      prisma.iamOrganizationMembership.updateMany({
        where: { identityId: params.identityId },
        data: { isDefault: false },
      }),
      prisma.iamOrganizationMembership.update({
        where: { id: membership.id },
        data: { isDefault: true },
      }),
    ]);
  }

  async getPermissionsForMembership(
    identityId: string,
    organizationId: string
  ): Promise<{ roles: string[]; permissions: string[] }> {
    const membership = await prisma.iamOrganizationMembership.findUnique({
      where: {
        identityId_organizationId: { identityId, organizationId },
      },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });
    if (!membership || membership.status !== "active") {
      return { roles: [], permissions: [] };
    }
    const roles = membership.role ? [membership.role.key] : [];
    const permissions = membership.role
      ? [
          ...new Set(
            membership.role.permissions.map((rp) => rp.permission.key)
          ),
        ]
      : [];
    return { roles, permissions };
  }

  async findIdentityByEmail(email: string) {
    return prisma.iamIdentity.findUnique({
      where: { emailNormalized: normalizeEmail(email) },
    });
  }
}

export const organizationService = new OrganizationService();
