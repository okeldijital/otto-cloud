/**
 * A.8 Step 5 — IAM owner ↔ platform.admin reconciliation (DRY-RUN by default).
 *
 * Purpose:
 *   Catalog v5 owner templates included platform.admin.
 *   Catalog v6 owner templates exclude it.
 *   seedOrgSystemRoles uses createMany(skipDuplicates) and NEVER removes
 *   surplus role_permissions — so existing DBs may still grant owners
 *   platform.admin in the permission list.
 *
 * Safety:
 *   - Default mode is dry-run only (report, no writes).
 *   - --apply is intentionally disabled in this Step 5 deliverable.
 *   - Only touches IAM tables (iam_role_permissions / iam_roles / iam_permissions).
 *   - Never touches business tables (artists, releases, contracts, etc.).
 *
 * Usage (local / ops review only — do NOT run against production in Step 5):
 *   npx tsx scripts/reconcile-iam-owner-platform-admin.ts
 *   npx tsx scripts/reconcile-iam-owner-platform-admin.ts --dry-run
 *
 * Production IAM modified: NO (this script must not be run against production here)
 */

import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY || process.argv.includes("--dry-run");

type Finding = {
  organizationId: string;
  roleId: string;
  roleKey: string;
  permissionKey: string;
  rolePermissionId: string;
};

async function main() {
  console.log("=== IAM owner/platform.admin reconciliation ===");
  console.log(`Mode: ${APPLY && !DRY_RUN ? "APPLY (DISABLED IN STEP 5)" : "DRY-RUN"}`);
  console.log("");

  if (APPLY) {
    console.error(
      "REFUSED: --apply is disabled in A.8 Step 5. " +
        "Reconciliation against any database must be a separate operational step " +
        "after explicit production authorization."
    );
    process.exit(2);
  }

  const platformPerm = await prisma.iamPermission.findUnique({
    where: { key: "platform.admin" },
  });

  if (!platformPerm) {
    console.log("platform.admin permission not found in catalog — nothing to report.");
    console.log("Current: owner → platform.admin = NO (permission missing)");
    console.log("Target:  owner → platform.admin = NO");
    console.log("Other affected IAM records: 0");
    console.log("Business tables affected: 0");
    return;
  }

  // Owner (and org-scoped) roles that still hold platform.admin
  const rows = await prisma.iamRolePermission.findMany({
    where: {
      permissionId: platformPerm.id,
      role: {
        key: { in: ["owner", "administrator", "org_admin", "manager", "member"] },
      },
    },
    include: {
      role: { select: { id: true, key: true, organizationId: true, isSystem: true } },
    },
  });

  const findings: Finding[] = rows.map((r) => ({
    organizationId: r.role.organizationId,
    roleId: r.role.id,
    roleKey: r.role.key,
    permissionKey: "platform.admin",
    rolePermissionId: r.id,
  }));

  const ownerHits = findings.filter((f) => f.roleKey === "owner");

  console.log(
    `Current: owner → platform.admin = ${ownerHits.length > 0 ? "YES" : "NO"}`
  );
  console.log(`  owner role rows with platform.admin: ${ownerHits.length}`);
  console.log(
    `Target:  owner → platform.admin = NO`
  );
  console.log(`Other affected IAM records (non-owner org roles): ${findings.length - ownerHits.length}`);
  console.log(`Business tables affected: 0`);
  console.log("");

  if (findings.length === 0) {
    console.log("No surplus platform.admin links on org-scoped system roles.");
    return;
  }

  console.log("Would delete (IAM only) if --apply were authorized later:");
  for (const f of findings.slice(0, 50)) {
    console.log(
      `  - iam_role_permissions id=${f.rolePermissionId} org=${f.organizationId} role=${f.roleKey}`
    );
  }
  if (findings.length > 50) {
    console.log(`  ... and ${findings.length - 50} more`);
  }

  console.log("");
  console.log("Idempotent plan (future operational step):");
  console.log("  1. SELECT role_permissions where permission=platform.admin and role.key in org system roles");
  console.log("  2. DELETE those rows only (never business tables)");
  console.log("  3. Re-run seedOrgSystemRoles (additive) — safe; does not re-add platform.admin to owner (catalog v6)");
  console.log("  4. Re-check counts → owner → platform.admin = NO");
  console.log("");
  console.log("DRY-RUN complete. No database writes performed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
