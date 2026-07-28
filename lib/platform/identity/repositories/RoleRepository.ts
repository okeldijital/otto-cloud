import { prisma } from "@/lib/prisma";

export class RoleRepository {
  async findByKey(organizationId: string, key: string) {
    return prisma.iamRole.findFirst({
      where: { organizationId, key },
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  async listForOrganization(organizationId: string) {
    return prisma.iamRole.findMany({
      where: { organizationId },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { memberships: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async getPermissionsForRole(roleId: string): Promise<string[]> {
    const rows = await prisma.iamRolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rows.map((r) => r.permission.key);
  }
}

export const roleRepository = new RoleRepository();
