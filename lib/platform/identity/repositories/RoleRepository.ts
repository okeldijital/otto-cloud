import { prisma } from "@/lib/prisma";
import { SYSTEM_ROLE_TEMPLATES } from "../permissions/catalog";

function slugifyRoleKey(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 56);
  return base || "custom_role";
}

export class RoleRepository {
  async findByKey(organizationId: string, key: string) {
    return prisma.iamRole.findFirst({
      where: { organizationId, key },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async findByIdForOrganization(organizationId: string, id: string) {
    return prisma.iamRole.findFirst({
      where: { organizationId, id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { memberships: true } },
      },
    });
  }

  async listForOrganization(organizationId: string) {
    const roles = await prisma.iamRole.findMany({
      where: { organizationId },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { memberships: true } },
      },
    });

    const systemOrder = new Map(
      Object.keys(SYSTEM_ROLE_TEMPLATES).map((key, index) => [key, index])
    );

    return roles.sort((a, b) => {
      if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
      if (a.isSystem && b.isSystem) {
        return (systemOrder.get(a.key) ?? 999) - (systemOrder.get(b.key) ?? 999);
      }
      return a.name.localeCompare(b.name);
    });
  }

  async getPermissionsForRole(roleId: string): Promise<string[]> {
    const rows = await prisma.iamRolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rows.map((r) => r.permission.key);
  }

  async createCustomRole(params: {
    organizationId: string;
    name: string;
    description?: string | null;
    permissionKeys: string[];
  }) {
    const baseKey = slugifyRoleKey(params.name);
    let key = baseKey;
    let suffix = 2;
    while (await this.findByKey(params.organizationId, key)) {
      key = `${baseKey}_${suffix++}`;
    }

    return prisma.$transaction(async (tx) => {
      const permissions = await tx.iamPermission.findMany({
        where: { key: { in: params.permissionKeys } },
        select: { id: true },
      });

      const role = await tx.iamRole.create({
        data: {
          organizationId: params.organizationId,
          key,
          name: params.name.trim(),
          description: params.description?.trim() || null,
          isSystem: false,
        },
      });

      if (permissions.length) {
        await tx.iamRolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          })),
          skipDuplicates: true,
        });
      }

      await tx.iamOrganization.update({
        where: { id: params.organizationId },
        data: { roleVersion: { increment: 1 } },
      });

      return tx.iamRole.findUnique({
        where: { id: role.id },
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { memberships: true } },
        },
      });
    });
  }

  async updateCustomRole(params: {
    organizationId: string;
    id: string;
    name: string;
    description?: string | null;
    permissionKeys: string[];
  }) {
    return prisma.$transaction(async (tx) => {
      const role = await tx.iamRole.findFirst({
        where: { id: params.id, organizationId: params.organizationId },
        select: { id: true, isSystem: true },
      });
      if (!role) return null;
      if (role.isSystem) throw new Error("SYSTEM_ROLE_IMMUTABLE");

      const permissions = await tx.iamPermission.findMany({
        where: { key: { in: params.permissionKeys } },
        select: { id: true },
      });

      await tx.iamRole.update({
        where: { id: params.id },
        data: {
          name: params.name.trim(),
          description: params.description?.trim() || null,
        },
      });

      await tx.iamRolePermission.deleteMany({ where: { roleId: params.id } });
      if (permissions.length) {
        await tx.iamRolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: params.id,
            permissionId: permission.id,
          })),
          skipDuplicates: true,
        });
      }

      await tx.iamOrganization.update({
        where: { id: params.organizationId },
        data: { roleVersion: { increment: 1 } },
      });

      return tx.iamRole.findUnique({
        where: { id: params.id },
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { memberships: true } },
        },
      });
    });
  }

  async deleteCustomRole(organizationId: string, id: string) {
    return prisma.$transaction(async (tx) => {
      const role = await tx.iamRole.findFirst({
        where: { id, organizationId },
        select: { id: true, isSystem: true },
      });
      if (!role) return { deleted: false, reason: "NOT_FOUND" as const };
      if (role.isSystem) return { deleted: false, reason: "SYSTEM_ROLE" as const };

      const memberCount = await tx.iamOrganizationMembership.count({
        where: { organizationId, roleId: id, status: { not: "removed" } },
      });
      if (memberCount > 0) {
        return { deleted: false, reason: "ROLE_IN_USE" as const, memberCount };
      }

      await tx.iamRole.delete({ where: { id } });
      await tx.iamOrganization.update({
        where: { id: organizationId },
        data: { roleVersion: { increment: 1 } },
      });
      return { deleted: true as const };
    });
  }
}

export const roleRepository = new RoleRepository();
