/**
 * A.7 Cloud Runtime Diagnostics
 *
 * Read-only operational diagnostic. Never writes to the database.
 * Intended for local/operator use against the exact Vercel/Neon target.
 */

import { prisma } from "../lib/prisma";
import { inspectDatabaseTarget } from "../lib/platform/identity/bootstrap/safety";

const secretNames = [
  "DATABASE_URL",
  "DIRECT_URL",
  "IAM_ENCRYPTION_KEY",
  "IAM_ACCESS_TOKEN_SECRET",
  "INITIAL_ADMIN_PASSWORD",
  "NEXTAUTH_SECRET",
];

function present(name: string): string {
  return process.env[name] ? "SET" : "NOT SET";
}

async function count(name: string, fn: () => Promise<number>) {
  try {
    return { name, count: await fn(), status: "ok" as const };
  } catch (error) {
    return {
      name,
      count: null,
      status: "error" as const,
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}

async function main() {
  const target = inspectDatabaseTarget();

  console.log("\nOTTO A.7 Cloud Runtime Diagnostics (READ-ONLY)\n");
  console.log("Target");
  console.log(`  classification: ${target.classification}`);
  console.log(`  host:           ${target.host || "(unset)"}`);
  console.log(`  database:       ${target.database || "(unset)"}`);
  console.log(`  endpoint:       ${target.endpointId || "(unknown)"}`);
  console.log(`  pooler:         ${target.isPooler}`);
  console.log(`  OTTO_ENV:       ${process.env.OTTO_ENV || "NOT SET"}`);
  console.log(`  NEON_BRANCH:    ${process.env.NEON_BRANCH || "NOT SET"}`);
  console.log(`  VERCEL_ENV:     ${process.env.VERCEL_ENV || "NOT SET"}`);

  console.log("\nEnvironment presence (values never printed)");
  for (const name of secretNames) console.log(`  ${name}: ${present(name)}`);

  if (!process.env.DIRECT_URL) {
    console.log("\nWARNING: DIRECT_URL is not set. Prisma migration commands may fail.");
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("\nDatabase connectivity: PASS");
  } catch (error) {
    console.error(
      `\nDatabase connectivity: FAIL — ${error instanceof Error ? error.message : "unknown error"}`
    );
    process.exitCode = 2;
    return;
  }

  const counts = await Promise.all([
    count("iamIdentity", () => prisma.iamIdentity.count()),
    count("iamCredential", () => prisma.iamCredential.count()),
    count("iamOrganization", () => prisma.iamOrganization.count()),
    count("iamMembership", () => prisma.iamMembership.count()),
    count("iamRole", () => prisma.iamRole.count()),
    count("iamPermission", () => prisma.iamPermission.count()),
    count("iamSession", () => prisma.iamSession.count()),
    count("iamMfa", () => prisma.iamMfa.count()),
  ]);

  console.log("\nIAM inventory");
  for (const item of counts) {
    if (item.status === "ok") console.log(`  ${item.name}: ${item.count}`);
    else console.log(`  ${item.name}: ERROR — ${item.error}`);
  }

  try {
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      ORDER BY started_at ASC
    `;
    const failed = migrations.filter((m) => !m.finished_at);
    console.log(`\nPrisma migrations: ${migrations.length} recorded, ${failed.length} unfinished`);
    if (failed.length) {
      for (const migration of failed) console.log(`  UNFINISHED: ${migration.migration_name}`);
      process.exitCode = 3;
    }
  } catch (error) {
    console.log(
      `\nPrisma migration history: ERROR — ${error instanceof Error ? error.message : "unknown error"}`
    );
    process.exitCode = 3;
  }

  console.log("\nNo INSERT/UPDATE/DELETE/DDL operations were executed by this diagnostic.\n");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
