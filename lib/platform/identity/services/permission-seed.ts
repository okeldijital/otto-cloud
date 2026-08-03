/**
 * Seed canonical permissions into iam_permissions (A.0 / A.6).
 *
 * Performance notes (org create hang root cause):
 * Sequential per-row upserts over Neon pooler (100–400 round-trips) made
 * `organizationService.createOrganization()` appear to hang during lab init.
 * Seeding is now batched: permissions in parallel chunks, role-permissions via
 * createMany(skipDuplicates).
 */

import { prisma } from "@/lib/prisma";
import { PERMISSION_CATALOG, SYSTEM_ROLE_TEMPLATES } from "../permissions/catalog";

const PERMISSION_CHUNK = 25;

export async function seedIamPermissions(): Promise<{ upserted: number }> {
  let upserted = 0;
  for (let i = 0; i < PERMISSION_CATALOG.length; i += PERMISSION_CHUNK) {
    const chunk = PERMISSION_CATALOG.slice(i, i + PERMISSION_CHUNK);
    await Promise.all(
      chunk.map((p) =>
        prisma.iamPermission.upsert({
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
        })
      )
    );
    upserted += chunk.length;
  }
  return { upserted };
}

/**
 * Ensure system role templates exist for an organization (A.5/A.6).
 * Idempotent — safe to re-run.
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

    const rows = template.permissions
      .map((permKey) => byKey.get(permKey))
      .filter((id): id is string => Boolean(id))
      .map((permissionId) => ({
        roleId: role.id,
        permissionId,
      }));

    if (rows.length === 0) continue;

    // createMany + skipDuplicates replaces N sequential upserts (major hang fix)
    await prisma.iamRolePermission.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }
}
