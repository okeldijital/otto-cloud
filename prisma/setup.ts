import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface MigrationRecord {
  id: string;
  checksum: string;
  finished_at: Date;
  migration_name: string;
  logs: string | null;
  rolled_back_at: Date | null;
  started_at: Date;
}

async function setupMigrations(): Promise<void> {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  const migrationFolders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => /^\d+_.+/.test(name))
    .sort();

  if (migrationFolders.length === 0) {
    console.log("No migrations found.");
    return;
  }

  const existing = await prisma.$queryRaw<any[]>`
    SELECT id FROM _prisma_migrations WHERE id = ANY(${migrationFolders}::text[])
  `;
  const existingIds = new Set(existing.map((r) => r.id));

  const now = new Date();
  const records: MigrationRecord[] = [];

  for (const folder of migrationFolders) {
    if (existingIds.has(folder)) continue;

    const migrationPath = path.join(migrationsDir, folder, "migration.sql");
    let checksum = "unknown";
    if (fs.existsSync(migrationPath)) {
      const content = fs.readFileSync(migrationPath, "utf-8");
      const hash = await import("crypto").then((c) => c.createHash("md5").update(content).digest("hex"));
      checksum = hash;
    }

    records.push({
      id: folder,
      checksum,
      finished_at: now,
      migration_name: folder,
      logs: null,
      rolled_back_at: null,
      started_at: now,
    });
  }

  if (records.length > 0) {
    for (const record of records) {
      await prisma.$executeRaw`
        INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at)
        VALUES (${record.id}, ${record.checksum}, ${record.finished_at}, ${record.migration_name}, ${record.logs}, ${record.rolled_back_at}, ${record.started_at})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`  Recorded ${records.length} migrations`);
  } else {
    console.log("  All migrations already recorded");
  }
}

async function main() {
  console.log("Otto Cloud — Setup");
  console.log("=".repeat(50));

  await prisma.$connect();
  console.log("Connected to database");

  await setupMigrations();
  await prisma.$disconnect();

  console.log("Migration history baseline complete.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
