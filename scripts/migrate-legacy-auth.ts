/**
 * Migrate legacy users → IAM identities (cutover).
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy-auth.ts
 *   npx tsx scripts/migrate-legacy-auth.ts --limit=50
 *   npx tsx scripts/migrate-legacy-auth.ts --user-id=1 --password='TempPassw0rd!'
 */

import {
  migrateAllLegacyUsers,
  migrateLegacyUser,
} from "../lib/platform/identity/services/legacy-migration";

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const userArg = args.find((a) => a.startsWith("--user-id="));
  const passArg = args.find((a) => a.startsWith("--password="));

  if (userArg) {
    const id = parseInt(userArg.split("=")[1], 10);
    const password = passArg?.split("=").slice(1).join("=");
    const result = await migrateLegacyUser(id, {
      plainPassword: password,
    });
    console.log(JSON.stringify(result, null, 2));
    if (!password) {
      console.log(
        "Note: password was randomized — user must reset via /auth/forgot-password"
      );
    }
    return;
  }

  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;
  const { migrated, results } = await migrateAllLegacyUsers({ limit });
  console.log(`Migrated ${migrated} users`);
  console.log(
    `Created: ${results.filter((r) => r.created).length}, linked existing: ${
      results.filter((r) => !r.created).length
    }`
  );
  console.log(
    "Passwords randomized for new identities — communicate password-reset flow."
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
