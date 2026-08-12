/**
 * A.7 production migration-baseline preflight.
 *
 * READ-ONLY. This script never creates, updates, migrates, deletes, or
 * bootstraps anything. It is deliberately separate from the eventual
 * `prisma migrate resolve --applied` operation.
 *
 * Required environment:
 *   DATABASE_URL
 *   NEON_BRANCH=production
 *   OTTO_ENV=production
 *
 * Usage:
 *   npm run audit:production-baseline
 */

import { PrismaClient } from "@prisma/client";

const EXPECTED_MIGRATIONS = [
  "0001_initial",
  "20260611214305_add_plan_features",
  "20260612172322_add_api_keys",
  "20260612172526_add_api_keys_relation",
  "20260612173434_add_enterprise_features",
  "20260619000001_add_release_workspace_models",
  "20260717133500_add_attachment_model",
  "20260717140000_repair_workspace_tables",
  "20260717141000_repair_iam_tenant_tables",
  "20260728120000_add_platform_document_assets",
  "20260728140000_document_intelligence",
  "20260728150000_human_verification",
  "20260728160000_verified_contract_domain",
  "20260728170000_contract_relationships",
  "20260728180000_contract_lifecycle",
  "20260728190000_platform_events_notifications",
  "20260728200000_release_contract_read_model",
  "20260728210000_platform_projection_checkpoints",
  "20260728220000_rights_domain",
  "20260728230000_royalty_entitlements",
  "20260729010000_iam_identity_platform",
  "20260729120000_iam_a2_password_lifecycle",
  "20260729140000_iam_a3_session_management",
  "20260729150000_iam_a4_mfa_totp",
  "20260729160000_iam_a5_org_rbac",
] as const;

const IAM_TABLES = [
  "iam_identities",
  "iam_credentials",
  "iam_password_credentials",
  "iam_password_history",
  "iam_password_reset_tokens",
  "iam_sessions",
  "iam_refresh_tokens",
  "iam_devices",
  "iam_organizations",
  "iam_organization_memberships",
  "iam_roles",
  "iam_permissions",
  "iam_role_permissions",
  "iam_mfa_credentials",
] as const;

function assertProductionTarget(): void {
  const branch = process.env.NEON_BRANCH;
  const env = process.env.OTTO_ENV;

  if (branch !== "production" || env !== "production") {
    throw new Error(
      `Refusing production baseline preflight: expected NEON_BRANCH=production and OTTO_ENV=production; received NEON_BRANCH=${branch ?? "<unset>"}, OTTO_ENV=${env ?? "<unset>"}.`
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }
}

async function main(): Promise<void> {
  assertProductionTarget();

  const prisma = new PrismaClient({ log: ["error"] });
  try {
    // Every query is explicitly executed in a read-only transaction. The
    // transaction-level setting prevents accidental writes if this script is
    // extended later.
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");

      const [tables, columns, constraints, indexes, migrationTable, iamPresence] =
        await Promise.all([
          tx.$queryRawUnsafe<Array<{ count: bigint }>>(
            "SELECT count(*)::bigint AS count FROM information_schema.tables WHERE table_schema='public'"
          ),
          tx.$queryRawUnsafe<Array<{ count: bigint }>>(
            "SELECT count(*)::bigint AS count FROM information_schema.columns WHERE table_schema='public'"
          ),
          tx.$queryRawUnsafe<Array<{ count: bigint }>>(
            "SELECT count(*)::bigint AS count FROM information_schema.table_constraints WHERE table_schema='public'"
          ),
          tx.$queryRawUnsafe<Array<{ count: bigint }>>(
            "SELECT count(*)::bigint AS count FROM pg_indexes WHERE schemaname='public'"
          ),
          tx.$queryRawUnsafe<Array<{ exists: boolean }>>(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations') AS exists"
          ),
          tx.$queryRawUnsafe<Array<{ table_name: string; present: boolean }>>(
            `SELECT table_name, true AS present FROM information_schema.tables WHERE table_schema='public' AND table_name IN (${IAM_TABLES.map((_, i) => `$${i + 1}`).join(",")}) ORDER BY table_name`,
            ...IAM_TABLES
          ),
        ]);

      return {
        tables: Number(tables[0]?.count ?? 0),
        columns: Number(columns[0]?.count ?? 0),
        constraints: Number(constraints[0]?.count ?? 0),
        indexes: Number(indexes[0]?.count ?? 0),
        hasPrismaMigrations: migrationTable[0]?.exists ?? false,
        iamTablesPresent: iamPresence.map((row) => row.table_name),
      };
    });

    const missingIamTables = IAM_TABLES.filter(
      (table) => !result.iamTablesPresent.includes(table)
    );

    console.log(JSON.stringify({
      audit: "A.7-production-baseline-preflight",
      readOnly: true,
      target: {
        neonBranch: process.env.NEON_BRANCH,
        ottoEnv: process.env.OTTO_ENV,
      },
      production: result,
      expectedMigrationCount: EXPECTED_MIGRATIONS.length,
      expectedMigrationNames: EXPECTED_MIGRATIONS,
      missingIamTables,
      recommendation:
        result.hasPrismaMigrations
          ? "STOP: production already has a Prisma migration ledger; inspect it before any baseline operation."
          : missingIamTables.length > 0
            ? "STOP: IAM schema is incomplete; do not baseline."
            : "PASS: production has the expected IAM structure and no migration ledger; proceed only to a separately reviewed Prisma resolve/baseline operation.",
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
