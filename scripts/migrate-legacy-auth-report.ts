/**
 * Produce a JSON migration report for A.4.5 cutover.
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy-auth-report.ts
 *   npx tsx scripts/migrate-legacy-auth-report.ts --migrate
 */

import { prisma } from "../lib/prisma";
import { migrateAllLegacyUsers } from "../lib/platform/identity/services/legacy-migration";

async function main() {
  const doMigrate = process.argv.includes("--migrate");

  const [legacyUsers, iamIdentities, linked] = await Promise.all([
    prisma.user.count(),
    prisma.iamIdentity.count(),
    prisma.iamIdentity.count({ where: { legacyUserId: { not: null } } }),
  ]);

  let migrateResult: Awaited<ReturnType<typeof migrateAllLegacyUsers>> | null =
    null;
  if (doMigrate) {
    migrateResult = await migrateAllLegacyUsers();
  }

  const unmigrated = await prisma.user.findMany({
    where: {
      is_active: true,
      NOT: {
        id: {
          in: (
            await prisma.iamIdentity.findMany({
              where: { legacyUserId: { not: null } },
              select: { legacyUserId: true },
            })
          )
            .map((i) => i.legacyUserId)
            .filter((x): x is number => x != null),
        },
      },
    },
    select: { id: true, email: true },
    take: 500,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    legacyUserCount: legacyUsers,
    iamIdentityCount: iamIdentities,
    linkedLegacyUserCount: linked,
    unmigratedActiveUsers: unmigrated.length,
    unmigratedSample: unmigrated.slice(0, 50),
    migrateRun: migrateResult
      ? {
          migrated: migrateResult.migrated,
          created: migrateResult.results.filter((r) => r.created).length,
          linkedExisting: migrateResult.results.filter((r) => !r.created)
            .length,
          note: "Passwords randomized unless --password used per-user; force reset via /auth/forgot-password",
        }
      : null,
    authenticationProvider: "iam",
    nextAuthRemoved: true,
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
