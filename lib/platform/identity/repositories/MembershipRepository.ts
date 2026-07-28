import { prisma } from "@/lib/prisma";

export class MembershipRepository {
  async find(identityId: string, organizationId: string) {
    return prisma.iamOrganizationMembership.findUnique({
      where: {
        identityId_organizationId: { identityId, organizationId },
      },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
        organization: true,
        identity: {
          select: {
            id: true,
            email: true,
            displayName: true,
            status: true,
          },
        },
      },
    });
  }

  async listForIdentity(identityId: string, activeOnly = true) {
    return prisma.iamOrganizationMembership.findMany({
      where: {
        identityId,
        ...(activeOnly ? { status: "active" } : { status: { not: "removed" } }),
      },
      include: {
        organization: true,
        role: true,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  }

  async listForOrganization(organizationId: string) {
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
      orderBy: [{ isOwner: "desc" }, { createdAt: "asc" }],
    });
  }

  async upsert(params: {
    identityId: string;
    organizationId: string;
    roleId?: string | null;
    status?: string;
    isDefault?: boolean;
    isOwner?: boolean;
  }) {
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
        roleId: params.roleId ?? null,
        status: params.status ?? "active",
        isDefault: params.isDefault ?? false,
        isOwner: params.isOwner ?? false,
        joinedAt: new Date(),
      },
      update: {
        roleId: params.roleId ?? undefined,
        status: params.status ?? undefined,
        isDefault: params.isDefault ?? undefined,
        isOwner: params.isOwner ?? undefined,
        membershipVersion: { increment: 1 },
        suspendedAt: params.status === "active" ? null : undefined,
        removedAt: params.status === "removed" ? new Date() : undefined,
      },
      include: { role: true, organization: true },
    });
  }

  async updateStatus(
    id: string,
    status: string,
    extra?: { suspendedAt?: Date | null; removedAt?: Date | null }
  ) {
    return prisma.iamOrganizationMembership.update({
      where: { id },
      data: {
        status,
        membershipVersion: { increment: 1 },
        suspendedAt: extra?.suspendedAt,
        removedAt: extra?.removedAt,
      },
    });
  }

  async setRole(id: string, roleId: string | null) {
    return prisma.iamOrganizationMembership.update({
      where: { id },
      data: {
        roleId,
        membershipVersion: { increment: 1 },
      },
      include: { role: true },
    });
  }

  async clearDefault(identityId: string) {
    return prisma.iamOrganizationMembership.updateMany({
      where: { identityId },
      data: { isDefault: false },
    });
  }

  async setDefault(id: string) {
    return prisma.iamOrganizationMembership.update({
      where: { id },
      data: { isDefault: true, membershipVersion: { increment: 1 } },
    });
  }

  async countActive(organizationId: string) {
    return prisma.iamOrganizationMembership.count({
      where: { organizationId, status: "active" },
    });
  }

  async audit(params: {
    organizationId: string;
    membershipId?: string | null;
    identityId?: string | null;
    actorIdentityId?: string | null;
    action: string;
    payload?: object;
  }) {
    try {
      await prisma.iamMembershipAudit.create({
        data: {
          organizationId: params.organizationId,
          membershipId: params.membershipId ?? null,
          identityId: params.identityId ?? null,
          actorIdentityId: params.actorIdentityId ?? null,
          action: params.action,
          payload: (params.payload ?? {}) as object,
        },
      });
    } catch {
      /* non-blocking */
    }
  }
}

export const membershipRepository = new MembershipRepository();
