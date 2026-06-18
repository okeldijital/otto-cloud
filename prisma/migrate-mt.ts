import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function main() {
  console.log("Migrating data to multi-tenant architecture...");

  // 1. Create tenants from existing organizations
  const orgs = await prisma.organizations.findMany();
  const orgToTenantMap = new Map<number, string>();

  for (const org of orgs) {
    const tenantId = uuidv4();
    await prisma.tenants.upsert({
      where: { id: tenantId },
      update: {},
      create: {
        id: tenantId,
        name: org.name,
        display_name: org.display_name || org.name,
        org_type: org.org_type || null,
        logo_url: org.logo_url || null,
        brand_color: org.brand_color || "#6366f1",
        is_active: true,
      },
    });
    orgToTenantMap.set(org.id, tenantId);
    console.log(`  Tenant created: ${org.name} -> ${tenantId}`);
  }

  // 2. Get the first org UUID as default for UUID-org-scoped tables
  const defaultOrgUUID = orgToTenantMap.values().next().value || "00000000-0000-0000-0000-000000000001";

  // 3. Update users: set tenant_id from organization_id
  const users = await prisma.user.findMany();
  for (const user of users) {
    const tenantId = orgToTenantMap.get(1) || defaultOrgUUID;
    await prisma.user.update({
      where: { id: user.id },
      data: { tenant_id: tenantId },
    });
  }
  console.log(`  Updated ${users.length} users with tenant_id`);

  // 4. Create tenant_users entries for existing users
  for (const user of users) {
    const tenantId = orgToTenantMap.get(1) || defaultOrgUUID;
    await prisma.tenant_users.upsert({
      where: { tenant_id_user_id: { tenant_id: tenantId, user_id: user.id } },
      update: { is_default: true, accepted_at: user.createdAt || new Date() },
      create: {
        tenant_id: tenantId,
        user_id: user.id,
        is_default: true,
        accepted_at: user.createdAt || new Date(),
      },
    });
  }
  console.log(`  Created ${users.length} tenant_users entries`);

  // 5. Update tenant_id on all UUID-based business tables
  const uuidTables = [
    "artists", "events", "notes", "releases", "works",
    "documents", "tasks", "contract_track_links",
    "status_quo_items", "subscriptions", "sso_providers",
    "report_definitions", "report_runs", "report_artifacts",
    "office_documents", "office_document_links",
    "office_notes", "office_note_links",
    "ai_sessions", "ai_audit_log",
    "ai_contract_attach_runs", "ai_contract_attach_links",
    "ai_contract_drafts", "ai_contract_resolution_runs",
    "jobs", "usage", "api_keys",
  ];

  for (const table of uuidTables) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET tenant_id = "organization_id"::uuid WHERE tenant_id IS NULL AND "organization_id" IS NOT NULL`
      );
      console.log(`  Updated tenant_id on ${table}`);
    } catch (err) {
      console.log(`  Skipped ${table} (may not have UUID org_id column)`);
    }
  }

  // 6. Update tenant_id on Int-based business tables
  const intTables = [
    "contracts", "contract_assets", "contract_documents", "contract_parties",
    "contract_split_groups", "contract_splits", "contract_intake_release_links",
    "individuals", "audit_logs",
    "ai_contract_documents", "ai_contract_work_links",
    "ai_core_write_apply_events", "ai_core_write_proposal_items",
    "ai_core_write_proposal_runs",
    "ai_release_integration_links", "ai_release_integration_runs",
    "ai_royalty_simulation_runs",
    "admin_backup_artifacts", "admin_restore_audit",
  ];

  for (const table of intTables) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET tenant_id = $1::uuid WHERE tenant_id IS NULL`,
        defaultOrgUUID
      );
      console.log(`  Updated tenant_id on ${table} (Int org_id)`);
    } catch (err) {
      console.log(`  Skipped ${table} (error)`);
    }
  }

  // 7. Update roles to link to tenants
  await prisma.$executeRawUnsafe(
    `UPDATE roles SET organization_id = $1::uuid WHERE organization_id IS NULL`,
    defaultOrgUUID
  );
  console.log("  Updated roles with tenant reference");

  // 8. Update teams to link to tenants
  await prisma.$executeRawUnsafe(
    `UPDATE teams SET organization_id = $1::uuid WHERE organization_id IS NULL`,
    defaultOrgUUID
  );
  console.log("  Updated teams with tenant reference");

  // 9. Set default tenant_id for tables that had no org data
  const miscTables = [
    "playlists", "royalties", "works_admin", "works_admin_documents",
    "tracks", "ai_messages", "ai_contract_resolution_links",
    "admin_backup_restore_events",
  ];

  for (const table of miscTables) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET tenant_id = $1::uuid WHERE tenant_id IS NULL`,
        defaultOrgUUID
      );
      console.log(`  Set default tenant_id on ${table}`);
    } catch (err) {
      console.log(`  Skipped ${table}`);
    }
  }

  console.log("Multi-tenant data migration complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
