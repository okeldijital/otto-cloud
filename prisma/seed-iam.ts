import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { code: "artists.view", name: "View Artists", module: "catalog" },
  { code: "artists.create", name: "Create Artists", module: "catalog" },
  { code: "artists.edit", name: "Edit Artists", module: "catalog" },
  { code: "artists.delete", name: "Delete Artists", module: "catalog" },
  { code: "songs.view", name: "View Songs/Tracks", module: "catalog" },
  { code: "songs.create", name: "Create Songs/Tracks", module: "catalog" },
  { code: "songs.edit", name: "Edit Songs/Tracks", module: "catalog" },
  { code: "songs.delete", name: "Delete Songs/Tracks", module: "catalog" },
  { code: "releases.view", name: "View Releases", module: "catalog" },
  { code: "releases.create", name: "Create Releases", module: "catalog" },
  { code: "releases.edit", name: "Edit Releases", module: "catalog" },
  { code: "releases.delete", name: "Delete Releases", module: "catalog" },
  { code: "releases.publish", name: "Publish Releases", module: "catalog" },
  { code: "works.view", name: "View Works", module: "catalog" },
  { code: "works.create", name: "Create Works", module: "catalog" },
  { code: "works.edit", name: "Edit Works", module: "catalog" },
  { code: "works.delete", name: "Delete Works", module: "catalog" },
  { code: "contracts.view", name: "View Contracts", module: "contracts" },
  { code: "contracts.create", name: "Create Contracts", module: "contracts" },
  { code: "contracts.edit", name: "Edit Contracts", module: "contracts" },
  { code: "contracts.delete", name: "Delete Contracts", module: "contracts" },
  { code: "contracts.sign", name: "Sign Contracts", module: "contracts" },
  { code: "royalties.view", name: "View Royalties", module: "finance" },
  { code: "royalties.edit", name: "Edit Royalties", module: "finance" },
  { code: "finance.view", name: "View Financial Reports", module: "finance" },
  { code: "finance.manage", name: "Manage Accounting", module: "finance" },
  { code: "network.view", name: "View Network Contacts", module: "network" },
  { code: "network.create", name: "Create Network Contacts", module: "network" },
  { code: "network.edit", name: "Edit Network Contacts", module: "network" },
  { code: "network.delete", name: "Delete Network Contacts", module: "network" },
  { code: "reports.view", name: "View Reports", module: "reports" },
  { code: "reports.create", name: "Create Reports", module: "reports" },
  { code: "reports.export", name: "Export Reports", module: "reports" },
  { code: "office.view", name: "View Office", module: "office" },
  { code: "office.create", name: "Create Office Items", module: "office" },
  { code: "office.edit", name: "Edit Office Items", module: "office" },
  { code: "office.delete", name: "Delete Office Items", module: "office" },
  { code: "tasks.view", name: "View Tasks", module: "tasks" },
  { code: "tasks.create", name: "Create Tasks", module: "tasks" },
  { code: "tasks.edit", name: "Edit Tasks", module: "tasks" },
  { code: "tasks.assign", name: "Assign Tasks", module: "tasks" },
  { code: "ai.view", name: "View AI Tools", module: "ai" },
  { code: "ai.use", name: "Use AI Tools", module: "ai" },
  { code: "ai.manage", name: "Manage AI Settings", module: "ai" },
  { code: "users.view", name: "View Users", module: "users" },
  { code: "users.invite", name: "Invite Users", module: "users" },
  { code: "users.edit", name: "Edit Users", module: "users" },
  { code: "users.suspend", name: "Suspend Users", module: "users" },
  { code: "users.delete", name: "Delete Users", module: "users" },
  { code: "users.manage", name: "Manage Users", module: "users" },
  { code: "roles.view", name: "View Roles", module: "users" },
  { code: "roles.manage", name: "Manage Roles", module: "users" },
  { code: "teams.view", name: "View Teams", module: "users" },
  { code: "teams.manage", name: "Manage Teams", module: "users" },
  { code: "permissions.view", name: "View Permissions", module: "users" },
  { code: "settings.view", name: "View Settings", module: "settings" },
  { code: "settings.edit", name: "Edit Settings", module: "settings" },
  { code: "system.backup", name: "Manage Backups", module: "system" },
  { code: "system.monitor", name: "View System Monitor", module: "system" },
  { code: "audit.view", name: "View Audit Logs", module: "system" },
  { code: "api_keys.manage", name: "Manage API Keys", module: "settings" },
  { code: "admin.access", name: "Admin Panel Access", module: "admin" },
  { code: "organization.view", name: "View Organization", module: "organization" },
  { code: "organization.edit", name: "Edit Organization", module: "organization" },
  { code: "organization.delete", name: "Delete Organization", module: "organization" },
  { code: "organization.transfer", name: "Transfer Ownership", module: "organization" },
  { code: "team.invite", name: "Invite Team Members", module: "organization" },
  { code: "team.remove", name: "Remove Team Members", module: "organization" },
  { code: "billing.view", name: "View Billing", module: "organization" },
  { code: "billing.manage", name: "Manage Billing", module: "organization" },
  { code: "branding.manage", name: "Manage Branding", module: "organization" },
];

const ROLES: { name: string; description: string; is_system: boolean; permissionCodes: string[] }[] = [
  { name: "Super Administrator", description: "Full platform control across all organizations", is_system: true, permissionCodes: PERMISSIONS.map(p => p.code) },
  { name: "Label Owner", description: "Own label management with full operational control", is_system: true, permissionCodes: ["artists.view", "artists.create", "artists.edit", "artists.delete", "songs.view", "songs.create", "songs.edit", "songs.delete", "releases.view", "releases.create", "releases.edit", "releases.delete", "releases.publish", "works.view", "works.create", "works.edit", "works.delete", "contracts.view", "contracts.create", "contracts.edit", "contracts.delete", "contracts.sign", "royalties.view", "royalties.edit", "finance.view", "finance.manage", "network.view", "network.create", "network.edit", "network.delete", "reports.view", "reports.create", "reports.export", "office.view", "office.create", "office.edit", "office.delete", "tasks.view", "tasks.create", "tasks.edit", "tasks.assign", "ai.view", "ai.use", "ai.manage", "users.view", "users.invite", "users.edit", "users.suspend", "users.delete", "users.manage", "roles.view", "roles.manage", "teams.view", "teams.manage", "permissions.view", "settings.view", "settings.edit", "system.backup", "system.monitor", "audit.view", "api_keys.manage", "admin.access", "organization.view", "organization.edit", "organization.delete", "organization.transfer", "team.invite", "team.remove", "billing.view", "billing.manage", "branding.manage"] },
  { name: "Executive", description: "Strategic oversight — read access plus financial and reporting visibility", is_system: true, permissionCodes: ["artists.view", "songs.view", "releases.view", "works.view", "contracts.view", "royalties.view", "finance.view", "network.view", "reports.view", "reports.create", "reports.export", "office.view", "tasks.view", "tasks.create", "tasks.assign", "ai.view", "ai.use", "users.view", "settings.view", "system.monitor", "audit.view", "organization.view", "team.invite", "billing.view"] },
  { name: "A&R", description: "Artist and repertoire — manage artists, songs, releases, and contracts", is_system: true, permissionCodes: ["artists.view", "artists.create", "artists.edit", "songs.view", "songs.create", "songs.edit", "releases.view", "releases.create", "releases.edit", "works.view", "works.create", "works.edit", "contracts.view", "contracts.create", "contracts.edit", "network.view", "network.create", "network.edit", "office.view", "office.create", "office.edit", "tasks.view", "tasks.create", "tasks.edit", "ai.view", "ai.use", "reports.view"] },
  { name: "Producer", description: "Recording projects — manage songs, releases, and studio tasks", is_system: true, permissionCodes: ["artists.view", "songs.view", "songs.create", "songs.edit", "releases.view", "releases.create", "releases.edit", "works.view", "tasks.view", "tasks.create", "tasks.edit", "network.view", "office.view", "ai.view", "ai.use"] },
  { name: "Artist", description: "Personal catalogue only — view own data and basic self-service", is_system: true, permissionCodes: ["artists.view", "songs.view", "releases.view", "works.view", "contracts.view", "royalties.view", "tasks.view", "tasks.create", "ai.view", "ai.use", "reports.view"] },
  { name: "Marketing", description: "Campaigns — manage releases, artwork, and promotional tasks", is_system: true, permissionCodes: ["artists.view", "songs.view", "releases.view", "releases.edit", "releases.publish", "works.view", "network.view", "network.create", "network.edit", "reports.view", "reports.create", "tasks.view", "tasks.create", "tasks.edit", "office.view", "office.create", "office.edit", "ai.view", "ai.use"] },
  { name: "PR", description: "Media and press — manage contacts and communications", is_system: true, permissionCodes: ["artists.view", "releases.view", "network.view", "network.create", "network.edit", "network.delete", "office.view", "office.create", "office.edit", "tasks.view", "tasks.create", "tasks.edit"] },
  { name: "Graphic Designer", description: "Artwork and creative assets — manage artwork tasks and files", is_system: true, permissionCodes: ["artists.view", "releases.view", "tasks.view", "tasks.create", "tasks.edit", "office.view", "office.create", "office.edit"] },
  { name: "Finance", description: "Royalties and accounting — full financial access", is_system: true, permissionCodes: ["artists.view", "songs.view", "releases.view", "works.view", "contracts.view", "contracts.sign", "royalties.view", "royalties.edit", "finance.view", "finance.manage", "reports.view", "reports.create", "reports.export", "tasks.view", "tasks.create", "ai.view", "ai.use"] },
  { name: "Administration", description: "Daily operations — user and team management", is_system: true, permissionCodes: ["artists.view", "songs.view", "releases.view", "works.view", "contracts.view", "royalties.view", "network.view", "network.create", "network.edit", "office.view", "office.create", "office.edit", "office.delete", "tasks.view", "tasks.create", "tasks.edit", "tasks.assign", "users.view", "users.invite", "users.edit", "users.suspend", "teams.view", "teams.manage", "roles.view", "settings.view", "settings.edit", "reports.view", "ai.view", "audit.view"] },
  { name: "Guest", description: "Read-only access to view catalog and basic data", is_system: true, permissionCodes: ["artists.view", "songs.view", "releases.view", "works.view", "contracts.view", "network.view", "reports.view", "office.view", "tasks.view"] },
];

async function main() {
  console.log("Seeding IAM: permissions and roles...");

  // Batch upsert permissions
  for (let i = 0; i < PERMISSIONS.length; i += 20) {
    const batch = PERMISSIONS.slice(i, i + 20);
    await Promise.all(batch.map(p =>
      prisma.permissions.upsert({
        where: { code: p.code },
        update: { name: p.name, module: p.module },
        create: { code: p.code, name: p.name, module: p.module },
      })
    ));
  }
  const permCount = await prisma.permissions.count();
  console.log(`  ${permCount} permissions ready`);

  const allPerms = await prisma.permissions.findMany();
  const permMap = new Map(allPerms.map(p => [p.code, p.id]));

  for (let i = 0; i < ROLES.length; i++) {
    const r = ROLES[i];
    const role = await prisma.roles.upsert({
      where: { name: r.name },
      update: { description: r.description, is_system: r.is_system },
      create: { name: r.name, description: r.description, is_system: r.is_system },
    });

    const pids = r.permissionCodes.map(c => permMap.get(c)).filter(Boolean) as number[];
    const existing = await prisma.role_permissions.findMany({ where: { role_id: role.id }, select: { permission_id: true } });
    const existingSet = new Set(existing.map(e => e.permission_id));
    const toAdd = pids.filter(pid => !existingSet.has(pid));
    if (toAdd.length > 0) {
      await prisma.role_permissions.createMany({
        data: toAdd.map(pid => ({ role_id: role.id, permission_id: pid })),
        skipDuplicates: true,
      });
    }
    console.log(`  "${r.name}" role: ${pids.length} permissions (${toAdd.length} new)`);
  }

  console.log("IAM seeding complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
