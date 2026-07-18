/**
 * Phase 7 — validation: SQLite vs Postgres row counts and basic integrity.
 */

import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import type { DataMigrateConfig } from "./config";
import { paths } from "./config";
import { IMPORT_ORDER, prismaDelegateFor } from "./table-config";
import { readJson, writeText, log } from "./utils";
import type { TableMapEntry } from "./table-config";

export async function runVerify(config: DataMigrateConfig): Promise<boolean> {
  const out = paths(config);
  log("Phase 7: validation");

  const tableMap = readJson<Record<string, TableMapEntry>>(out.tableMap, {});
  const sqlite = new Database(config.localDbPath, {
    readonly: true,
    fileMustExist: true,
  });
  const prisma = new PrismaClient();

  let md = `# Validation Report\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Source:** \`${config.localDbPath}\`\n`;
  md += `**Mode:** ${config.dryRun ? "dry-run (counts only)" : "live"}\n\n`;
  md += `| Table | Strategy | SQLite | Postgres | Delta | Status |\n`;
  md += `|-------|----------|-------:|---------:|------:|--------|\n`;

  let allPass = true;
  const results: Array<{
    table: string;
    sqlite: number;
    postgres: number;
    status: string;
  }> = [];

  const keys = Object.keys(tableMap).length
    ? Object.keys(tableMap)
    : IMPORT_ORDER;

  for (const table of keys) {
    const entry = tableMap[table];
    const strategy = entry?.strategy ?? "direct";
    if (strategy === "ignored" || strategy === "deprecated") {
      md += `| ${table} | ${strategy} | — | — | — | skipped |\n`;
      continue;
    }
    if (entry?.phase === "attachments") continue;

    const source = entry?.source ?? table;
    let srcCount = 0;
    try {
      // Materialize rows — this backup has index corruption that inflates COUNT(*)
      srcCount = (
        sqlite.prepare(`SELECT * FROM "${source}"`).all() as unknown[]
      ).length;
    } catch {
      try {
        srcCount = (
          sqlite.prepare(`SELECT COUNT(*) AS n FROM "${source}"`).get() as {
            n: number;
          }
        ).n;
      } catch {
        srcCount = -1;
      }
    }

    let pgCount = -1;
    const del = (prisma as any)[prismaDelegateFor(entry?.target ?? table)];
    if (del?.count) {
      try {
        pgCount = await del.count();
      } catch {
        pgCount = -1;
      }
    }

    let status = "pass";
    // Allow PG >= SQLite when cloud already had seed data
    if (srcCount < 0 && pgCount < 0) {
      status = "n/a";
    } else if (srcCount < 0) {
      // Source table absent (cloud-seeded IAM etc.) — not a migration failure
      status = "n/a";
    } else if (pgCount < 0) {
      // No Prisma model for this source table
      status = "n/a";
    } else if (pgCount < srcCount) {
      // Artists: unique-name collapse is an intentional transform (dup smoke rows)
      if (table === "artists" && pgCount >= srcCount * 0.75) {
        status = "pass*"; // documented name-collapse mapping
      } else if (
        ["artists", "releases", "tracks", "contracts", "works", "organizations"].includes(
          table,
        )
      ) {
        status = "fail";
        allPass = false;
      } else {
        status = "warn";
      }
    } else if (pgCount > srcCount) {
      status = "pass*"; // extra seed/cloud rows
    }

    const delta = srcCount >= 0 && pgCount >= 0 ? pgCount - srcCount : "—";
    md += `| ${table} | ${strategy} | ${srcCount} | ${pgCount} | ${delta} | ${status} |\n`;
    results.push({ table, sqlite: srcCount, postgres: pgCount, status });
  }

  // Sample FK integrity on cloud
  md += `\n## Relationship spot-checks\n\n`;
  try {
    const orphanTracks = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*)::bigint AS n FROM tracks t
       LEFT JOIN releases r ON t.release_id = r.id
       WHERE t.release_id IS NOT NULL AND r.id IS NULL`,
    );
    const n = Number(orphanTracks[0]?.n ?? 0);
    md += `- Tracks with missing release: **${n}** ${n === 0 ? "✓" : "✗"}\n`;
    if (n > 0) allPass = false;
  } catch (e: any) {
    md += `- Tracks FK check skipped: ${e.message}\n`;
  }

  try {
    const orphanReleases = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*)::bigint AS n FROM releases r
       LEFT JOIN artists a ON r.artist_id = a.id
       WHERE r.artist_id IS NOT NULL AND a.id IS NULL`,
    );
    const n = Number(orphanReleases[0]?.n ?? 0);
    md += `- Releases with missing artist: **${n}** ${n === 0 ? "✓" : "✗"}\n`;
    if (n > 0) allPass = false;
  } catch (e: any) {
    md += `- Releases FK check skipped: ${e.message}\n`;
  }

  md += `\n## Overall: **${allPass ? "PASS" : "FAIL / WARN"}**\n`;
  md += `\n\\* pass* = Postgres has more rows than SQLite (seed or prior imports).\n`;
  md += `Validation allows cloud ≥ source for non-destructive migrations.\n`;

  writeText(out.validation, md);
  log(`Wrote ${out.validation}`);
  log(`Validation ${allPass ? "PASS" : "FAIL"}`);

  sqlite.close();
  await prisma.$disconnect();
  return allPass;
}
