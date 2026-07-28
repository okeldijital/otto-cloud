/**
 * Seed canonical permissions into iam_permissions (A.0 / A.6).
 */

import { prisma } from "@/lib/prisma";
import { PERMISSION_CATALOG, SYSTEM_ROLE_TEMPLATES } from "../permissions/catalog";

export async function seedIamPermissions(): Promise<{ upserted: number }> {
  let upserted = 0;
  for (const p of PERMISSION_CATALOG) {
    await prisma.iamPermission.upsert({
      where: { key: p.key },
      create: {
        key: p.key,
        name: p.name,
        module: p.module,
      },
      update: {
        name: p.name,
        module: p.module,
      },
    });
    upserted += 1;
  }
  return { upserted };
}

/**
 * Ensure system role templates exist for an organization (A.5/A.6).
 */
export async function seedOrgSystemRoles(organizationId: string): Promise<void> {
  await seedIamPermissions();
  const allPerms = await prisma.iamPermission.findMany();
  const byKey = new Map(allPerms.map((p) => [p.key, p.id]));

  for (const [key, template] of Object.entries(SYSTEM_ROLE_TEMPLATES)) {
    const role = await prisma.iamRole.upsert({
      where: {
        organizationId_key: { organizationId, key },
      },
      create: {
        organizationId,
        key,
        name: template.name,
        isSystem: true,
      },
      update: {
        name: template.name,
        isSystem: true,
      },
    });

    for (const permKey of template.permissions) {
      const permissionId = byKey.get(permKey);
      if (!permissionId) continue;
      await prisma.iamRolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        create: { roleId: role.id, permissionId },
        update: {},
      });
    }
  }
}
