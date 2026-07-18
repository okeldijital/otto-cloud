/**
 * Phase 0–1: SQLite discovery, Prisma inventory, table-map generation.
 */

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import type { DataMigrateConfig } from "./config";
import { paths } from "./config";
import {
  IMPORT_ORDER,
  identityEntityFor,
  prismaDelegateFor,
  type Strategy,
  type TableMapEntry,
} from "./table-config";
import { log, writeJson, writeText } from "./utils";

interface SqliteColumn {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
}

export async function runInventory(config: DataMigrateConfig): Promise<void> {
  const out = paths(config);
  log("Phase 0–1: inventory & schema discovery");

  if (!fs.existsSync(config.localDbPath)) {
    throw new Error(`SQLite not found: ${config.localDbPath}`);
  }

  const sqlite = new Database(config.localDbPath, {
    readonly: true,
    fileMustExist: true,
  });

  const tables = sqlite
    .prepare(
      `SELECT name, type, sql FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    )
    .all() as Array<{ name: string; type: string; sql: string | null }>;

  const indexes = sqlite
    .prepare(
      `SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    )
    .all() as Array<{ name: string; tbl_name: string; sql: string | null }>;

  const triggers = sqlite
    .prepare(
      `SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger' ORDER BY name`,
    )
    .all() as Array<{ name: string; tbl_name: string; sql: string | null }>;

  // FKs via PRAGMA
  const fks: Array<{
    table: string;
    id: number;
    seq: number;
    table_ref: string;
    from: string;
    to: string;
  }> = [];
  const rowCounts: Record<string, number> = {};
  const columns: Record<string, SqliteColumn[]> = {};

  for (const t of tables) {
    if (t.type !== "table") continue;
    try {
      rowCounts[t.name] = (
        sqlite.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get() as {
          n: number;
        }
      ).n;
      columns[t.name] = sqlite
        .prepare(`PRAGMA table_info("${t.name}")`)
        .all() as SqliteColumn[];
      const fkRows = sqlite
        .prepare(`PRAGMA foreign_key_list("${t.name}")`)
        .all() as Array<{
        id: number;
        seq: number;
        table: string;
        from: string;
        to: string;
      }>;
      for (const fk of fkRows) {
        fks.push({
          table: t.name,
          id: fk.id,
          seq: fk.seq,
          table_ref: fk.table,
          from: fk.from,
          to: fk.to,
        });
      }
    } catch (e: any) {
      rowCounts[t.name] = -1;
    }
  }

  // --- sqlite-schema.md ---
  let sqliteMd = `# SQLite Schema Discovery\n\n`;
  sqliteMd += `**Source:** \`${config.localDbPath}\`\n`;
  sqliteMd += `**Generated:** ${new Date().toISOString()}\n\n`;
  sqliteMd += `## Summary\n\n`;
  sqliteMd += `| Metric | Count |\n|--------|------:|\n`;
  sqliteMd += `| Tables | ${tables.filter((t) => t.type === "table").length} |\n`;
  sqliteMd += `| Views | ${tables.filter((t) => t.type === "view").length} |\n`;
  sqliteMd += `| Indexes | ${indexes.length} |\n`;
  sqliteMd += `| Triggers | ${triggers.length} |\n`;
  sqliteMd += `| Foreign keys | ${fks.length} |\n`;
  sqliteMd += `| Total rows | ${Object.values(rowCounts).reduce((a, b) => a + Math.max(0, b), 0)} |\n\n`;

  sqliteMd += `## Tables & Row Counts\n\n| Table | Rows |\n|-------|-----:|\n`;
  for (const t of tables.filter((x) => x.type === "table")) {
    sqliteMd += `| ${t.name} | ${rowCounts[t.name] ?? "?"} |\n`;
  }

  sqliteMd += `\n## Columns\n\n`;
  for (const t of tables.filter((x) => x.type === "table")) {
    sqliteMd += `### ${t.name}\n\n`;
    sqliteMd += `| Column | Type | PK | NotNull |\n|--------|------|----|--------|\n`;
    for (const c of columns[t.name] ?? []) {
      sqliteMd += `| ${c.name} | ${c.type} | ${c.pk ? "Y" : ""} | ${c.notnull ? "Y" : ""} |\n`;
    }
    sqliteMd += `\n`;
  }

  sqliteMd += `## Foreign Keys\n\n| Table | From | References | To |\n|-------|------|------------|----|\n`;
  for (const fk of fks) {
    sqliteMd += `| ${fk.table} | ${fk.from} | ${fk.table_ref} | ${fk.to} |\n`;
  }

  sqliteMd += `\n## Indexes\n\n`;
  for (const ix of indexes) {
    sqliteMd += `- **${ix.name}** on \`${ix.tbl_name}\`: \`${ix.sql ?? ""}\`\n`;
  }

  sqliteMd += `\n## Triggers\n\n`;
  if (triggers.length === 0) sqliteMd += `_None_\n`;
  for (const tr of triggers) {
    sqliteMd += `### ${tr.name}\n\`\`\`sql\n${tr.sql}\n\`\`\`\n\n`;
  }

  sqliteMd += `\n## Views\n\n`;
  const views = tables.filter((t) => t.type === "view");
  if (views.length === 0) sqliteMd += `_None_\n`;
  for (const v of views) {
    sqliteMd += `### ${v.name}\n\`\`\`sql\n${v.sql}\n\`\`\`\n\n`;
  }

  writeText(out.sqliteSchema, sqliteMd);

  // --- postgres-schema.md from Prisma ---
  const prisma = new PrismaClient();
  const dm = (
    prisma as unknown as {
      _runtimeDataModel: { models: Record<string, { fields: any[]; dbName?: string }> };
    }
  )._runtimeDataModel;

  let pgMd = `# PostgreSQL (Prisma) Schema\n\n`;
  pgMd += `**Generated:** ${new Date().toISOString()}\n\n`;
  pgMd += `| Model | DB Table | Scalar Fields |\n|-------|----------|--------------:|\n`;

  const prismaTables = new Set<string>();
  for (const [modelName, model] of Object.entries(dm.models)) {
    const tableName = model.dbName ?? modelName;
    const mapped =
      tableName === "User"
        ? "users"
        : // @@map
          (model as any).dbName ??
          // heuristic for User
          (modelName === "User" ? "users" : modelName);
    // Prefer @@map via Prisma DMMF if available
    let dbTable = modelName;
    try {
      // runtime model may expose dbName on model
      dbTable = (model as any).dbName || (modelName === "User" ? "users" : modelName);
    } catch {
      dbTable = modelName === "User" ? "users" : modelName;
    }
    // Attachment maps to attachments
    if (modelName === "Attachment") dbTable = "attachments";
    if (modelName === "User") dbTable = "users";

    prismaTables.add(dbTable.toLowerCase());
    prismaTables.add(modelName.toLowerCase());
    const scalars = model.fields.filter(
      (f: any) => f.kind === "scalar" || f.kind === "enum",
    );
    pgMd += `| ${modelName} | ${dbTable} | ${scalars.length} |\n`;
  }

  pgMd += `\n## Models\n\n`;
  for (const [modelName, model] of Object.entries(dm.models)) {
    pgMd += `### ${modelName}\n\n| Field | Type | Kind |\n|-------|------|------|\n`;
    for (const f of model.fields) {
      pgMd += `| ${f.name} | ${f.type} | ${f.kind} |\n`;
    }
    pgMd += `\n`;
  }
  writeText(out.postgresSchema, pgMd);

  // Live PG counts
  const pgCounts: Record<string, number> = {};
  for (const key of IMPORT_ORDER) {
    const del = prismaDelegateFor(key);
    const d = (prisma as any)[del];
    if (d?.count) {
      try {
        pgCounts[key] = await d.count();
      } catch {
        pgCounts[key] = -1;
      }
    }
  }
  await prisma.$disconnect();

  // --- table-map.json ---
  const tableMap: Record<string, TableMapEntry> = {};
  const sqliteNames = new Set(
    tables.filter((t) => t.type === "table").map((t) => t.name),
  );

  const knownStrategies: Record<string, Strategy> = {
    distributors: "deprecated",
    login_history: "ignored",
    playing_with_neon: "ignored",
    alembic_version: "ignored",
    workspace_activities: "ignored",
    workspace_events: "ignored",
    workspace_links: "ignored",
    workspace_status_transitions: "ignored",
    workspace_tasks: "ignored",
  };

  for (const name of sqliteNames) {
    let strategy: Strategy = "direct";
    let phase: TableMapEntry["phase"] = "system";
    let notes: string | undefined;

    if (knownStrategies[name]) {
      strategy = knownStrategies[name];
      notes = "Marked non-migratable or replaced by cloud IAM/workspace engine";
    } else if (
      [
        "organizations",
        "users",
        "roles",
        "permissions",
        "role_permissions",
        "user_roles",
        "teams",
        "team_members",
      ].includes(name)
    ) {
      phase = "foundation";
      strategy = name === "users" ? "transform" : "direct";
    } else if (["individuals", "individual_organizations"].includes(name)) {
      phase = "crm";
    } else if (
      [
        "labels",
        "publishers",
        "pros",
        "platforms",
        "artists",
        "works",
        "releases",
        "tracks",
        "track_releases",
        "artist_memberships",
      ].includes(name)
    ) {
      phase = "catalog";
      strategy = "transform";
    } else if (name.startsWith("contract")) {
      phase = "contracts";
      strategy = "transform";
    } else if (["royalties"].includes(name)) {
      phase = "financial";
    } else if (name.startsWith("ai_")) {
      phase = "ai";
      strategy = "ignored";
      notes = "AI run history optional; enable per customer if needed";
    } else if (name.startsWith("workspace") || name.startsWith("admin_")) {
      phase = "workspace";
      strategy = name.startsWith("admin_") ? "ignored" : "ignored";
      notes = "Cloud workspace engine is source of truth";
    } else if (
      [
        "documents",
        "office_documents",
        "office_document_links",
        "office_notes",
        "office_note_links",
        "works_admin",
        "works_admin_documents",
        "report_runs",
        "report_artifacts",
        "report_definitions",
      ].includes(name)
    ) {
      phase = "administration";
    }

    // If not in Prisma at all
    const inPrisma =
      prismaTables.has(name.toLowerCase()) ||
      (name === "users" && prismaTables.has("user"));
    if (!inPrisma && strategy === "direct") {
      strategy = "deprecated";
      notes = notes ?? "No matching Prisma model";
    }

    tableMap[name] = {
      source: name,
      target: name === "users" ? "users" : name,
      prismaDelegate: name === "users" ? "user" : undefined,
      strategy,
      phase,
      notes,
      identityEntity: identityEntityFor(name),
    };
  }

  // Ensure IMPORT_ORDER tables present even if empty in source
  for (const name of IMPORT_ORDER) {
    if (!tableMap[name]) {
      tableMap[name] = {
        source: name,
        target: name,
        strategy: "direct",
        phase: "system",
        notes: "Present in import order but absent from source SQLite",
        identityEntity: identityEntityFor(name),
      };
    }
  }

  // Attachments special
  tableMap["attachments"] = {
    source: "(cloud-only + asset migration)",
    target: "attachments",
    strategy: "transform",
    phase: "attachments",
    notes: "Do not re-upload files. Link entityType/entityId via id-map.",
  };

  writeJson(out.tableMap, tableMap);

  // --- schema-comparison.md ---
  let cmp = `# Schema Comparison — SQLite ↔ PostgreSQL\n\n`;
  cmp += `**Generated:** ${new Date().toISOString()}\n\n`;
  cmp += `## Exact / Direct matches\n\n`;
  for (const [k, v] of Object.entries(tableMap)) {
    if (v.strategy === "direct") cmp += `- \`${k}\` → \`${v.target}\`\n`;
  }
  cmp += `\n## Transform\n\n`;
  for (const [k, v] of Object.entries(tableMap)) {
    if (v.strategy === "transform")
      cmp += `- \`${k}\` → \`${v.target}\`${v.notes ? ` — ${v.notes}` : ""}\n`;
  }
  cmp += `\n## Deprecated / Ignored\n\n`;
  for (const [k, v] of Object.entries(tableMap)) {
    if (v.strategy === "deprecated" || v.strategy === "ignored")
      cmp += `- \`${k}\` (${v.strategy})${v.notes ? `: ${v.notes}` : ""}\n`;
  }
  cmp += `\n## Cloud-only (no SQLite source)\n\n`;
  cmp += `- \`attachments\` (from asset migration)\n`;
  cmp += `- \`tenants\`, \`tenant_users\`, \`invitations\`, \`plans\`, \`subscriptions\` (cloud IAM)\n`;
  cmp += `- Modern workspace engine tables beyond legacy workspace_* copies\n`;

  cmp += `\n## Row count snapshot\n\n| Table | SQLite | Postgres |\n|-------|-------:|---------:|\n`;
  for (const name of IMPORT_ORDER) {
    cmp += `| ${name} | ${rowCounts[name] ?? 0} | ${pgCounts[name] ?? "—"} |\n`;
  }
  writeText(out.schemaComparison, cmp);

  writeJson(out.inventoryJson, {
    generatedAt: new Date().toISOString(),
    sourceDbPath: config.localDbPath,
    tables: tables.map((t) => ({
      name: t.name,
      type: t.type,
      rows: rowCounts[t.name] ?? null,
    })),
    foreignKeys: fks,
    indexCount: indexes.length,
    triggerCount: triggers.length,
    postgresCounts: pgCounts,
  });

  sqlite.close();
  log(`Wrote ${out.sqliteSchema}`);
  log(`Wrote ${out.postgresSchema}`);
  log(`Wrote ${out.schemaComparison}`);
  log(`Wrote ${out.tableMap}`);
  log(`Wrote ${out.inventoryJson}`);
}

export async function runDataQualityProfile(
  config: DataMigrateConfig,
): Promise<void> {
  const out = paths(config);
  log("Phase 2: data quality profiling");

  const sqlite = new Database(config.localDbPath, {
    readonly: true,
    fileMustExist: true,
  });

  const tables = sqlite
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    )
    .all() as Array<{ name: string }>;

  let md = `# Data Quality Report\n\n`;
  md += `**Source:** \`${config.localDbPath}\`\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `Legacy data is assumed imperfect. The migrator adapts (null FKs, duplicates, bad dates).\n\n`;

  for (const { name } of tables) {
    let count = 0;
    try {
      count = (
        sqlite.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get() as {
          n: number;
        }
      ).n;
    } catch {
      continue;
    }
    if (count === 0) continue;

    const cols = sqlite.prepare(`PRAGMA table_info("${name}")`).all() as SqliteColumn[];
    md += `## ${name} (${count} rows)\n\n`;

    // NULL percentages for first 12 columns
    md += `| Column | Null % | Empty string % |\n|--------|-------:|---------------:|\n`;
    for (const c of cols.slice(0, 16)) {
      try {
        const nulls = (
          sqlite
            .prepare(
              `SELECT COUNT(*) AS n FROM "${name}" WHERE "${c.name}" IS NULL`,
            )
            .get() as { n: number }
        ).n;
        const empties = (
          sqlite
            .prepare(
              `SELECT COUNT(*) AS n FROM "${name}" WHERE TRIM(CAST("${c.name}" AS TEXT)) = ''`,
            )
            .get() as { n: number }
        ).n;
        md += `| ${c.name} | ${((nulls / count) * 100).toFixed(1)}% | ${((empties / count) * 100).toFixed(1)}% |\n`;
      } catch {
        md += `| ${c.name} | ? | ? |\n`;
      }
    }

    // Duplicate primary keys
    const pk = cols.find((c) => c.pk === 1);
    if (pk) {
      try {
        const dups = (
          sqlite
            .prepare(
              `SELECT COUNT(*) AS n FROM (SELECT "${pk.name}" FROM "${name}" GROUP BY "${pk.name}" HAVING COUNT(*) > 1)`,
            )
            .get() as { n: number }
        ).n;
        md += `\n- Duplicate PK groups on \`${pk.name}\`: **${dups}**\n`;
      } catch {
        /* ignore */
      }
    }

    // Orphan FKs
    const fks = sqlite.prepare(`PRAGMA foreign_key_list("${name}")`).all() as Array<{
      table: string;
      from: string;
      to: string;
    }>;
    for (const fk of fks) {
      try {
        const orphans = (
          sqlite
            .prepare(
              `SELECT COUNT(*) AS n FROM "${name}" c
               LEFT JOIN "${fk.table}" p ON c."${fk.from}" = p."${fk.to}"
               WHERE c."${fk.from}" IS NOT NULL AND p."${fk.to}" IS NULL`,
            )
            .get() as { n: number }
        ).n;
        if (orphans > 0) {
          md += `- Orphan FK \`${fk.from}\` → \`${fk.table}.${fk.to}\`: **${orphans}**\n`;
        }
      } catch {
        /* ignore */
      }
    }
    md += `\n`;
  }

  writeText(out.dataQuality, md);
  sqlite.close();
  log(`Wrote ${out.dataQuality}`);
}
