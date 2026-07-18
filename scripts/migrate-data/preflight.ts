/**
 * Preflight checks before migration.
 */

import fs from "fs";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import type { DataMigrateConfig } from "./config";
import { log, warn, error, maskDatabaseUrl } from "./utils";

export interface PreflightResult {
  ok: boolean;
  checks: Array<{ name: string; pass: boolean; detail: string }>;
}

export async function runPreflight(
  config: DataMigrateConfig,
): Promise<PreflightResult> {
  const checks: PreflightResult["checks"] = [];

  // SQLite exists
  const sqliteExists = fs.existsSync(config.localDbPath);
  checks.push({
    name: "sqlite_exists",
    pass: sqliteExists,
    detail: config.localDbPath,
  });

  let catalogRows = 0;
  if (sqliteExists) {
    try {
      const db = new Database(config.localDbPath, {
        readonly: true,
        fileMustExist: true,
      });
      for (const t of ["artists", "releases", "tracks", "contracts"]) {
        try {
          catalogRows += (
            db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get() as { n: number }
          ).n;
        } catch {
          /* */
        }
      }
      db.close();
      checks.push({
        name: "sqlite_readable",
        pass: true,
        detail: `catalog entity rows ≈ ${catalogRows}`,
      });
      if (catalogRows === 0) {
        checks.push({
          name: "sqlite_has_catalog",
          pass: false,
          detail:
            "Source DB has 0 artists/releases/tracks/contracts. Set OTTO_SQLITE_PATH to a richer backup.",
        });
      } else {
        checks.push({
          name: "sqlite_has_catalog",
          pass: true,
          detail: `${catalogRows} catalog rows`,
        });
      }
    } catch (e: any) {
      checks.push({
        name: "sqlite_readable",
        pass: false,
        detail: e.message,
      });
    }
  }

  // Postgres
  if (!config.databaseUrl) {
    checks.push({
      name: "database_url",
      pass: false,
      detail: "DATABASE_URL not set",
    });
  } else {
    checks.push({
      name: "database_url",
      pass: true,
      detail: maskDatabaseUrl(config.databaseUrl),
    });
    const prisma = new PrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.push({ name: "postgres_connect", pass: true, detail: "ok" });
      // Ensure we will not wipe data — only check connectivity
      const artistCount = await prisma.artists.count().catch(() => -1);
      checks.push({
        name: "postgres_artists_table",
        pass: artistCount >= 0,
        detail: `artists count=${artistCount}`,
      });
    } catch (e: any) {
      checks.push({
        name: "postgres_connect",
        pass: false,
        detail: e.message,
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  // Output dir writable
  try {
    fs.mkdirSync(config.outputDir, { recursive: true });
    const test = `${config.outputDir}/.write-test`;
    fs.writeFileSync(test, "ok");
    fs.unlinkSync(test);
    checks.push({
      name: "output_writable",
      pass: true,
      detail: config.outputDir,
    });
  } catch (e: any) {
    checks.push({
      name: "output_writable",
      pass: false,
      detail: e.message,
    });
  }

  const ok = checks.every((c) => c.pass);
  log("Preflight results:");
  for (const c of checks) {
    const line = `  ${c.pass ? "✓" : "✗"} ${c.name}: ${c.detail}`;
    if (c.pass) log(line);
    else warn(line);
  }
  if (!ok) error("Preflight failed.");
  else log("Preflight passed.");
  return { ok, checks };
}

export async function requirePreflight(
  config: DataMigrateConfig,
): Promise<void> {
  if (config.skipPreflight) {
    warn("Skipping preflight (--skip-preflight)");
    return;
  }
  const result = await runPreflight(config);
  if (!result.ok) {
    throw new Error("Preflight checks failed. Fix issues or pass --skip-preflight.");
  }
}
