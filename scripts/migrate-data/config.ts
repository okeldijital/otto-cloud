/**
 * Legacy Desktop → Cloud Data Migration Framework — configuration.
 *
 * Customer-agnostic: paths and org identity come from env/CLI, not hard-coded
 * business data. This framework is reusable for any Otto desktop customer.
 */

import path from "path";
import os from "os";
import fs from "fs";

export type DataMigrationMode =
  | "preflight"
  | "inventory"
  | "profile"
  | "dry-run"
  | "migrate"
  | "verify"
  | "report"
  | "link-attachments";

export interface DataMigrateConfig {
  mode: DataMigrationMode;
  /** Absolute path to source SQLite database */
  localDbPath: string;
  /** Output directory for reports, state, id-map (project migration/) */
  outputDir: string;
  /** Prisma DATABASE_URL (cloud PostgreSQL) */
  databaseUrl?: string;
  /** Cloud org UUID used for string-scoped organization_id columns */
  cloudOrgUuid: string;
  /** Optional integer org id for int-scoped organization_id columns (after map) */
  defaultCloudOrgId?: number;
  dryRun: boolean;
  /** Resume from migration-state.json */
  resume: boolean;
  /** Only process this table (Prisma model / table key) */
  tableFilter?: string;
  /** Max rows per table (pilot) */
  limit?: number;
  /** Skip preflight checks */
  skipPreflight: boolean;
  /** Max retries for transient row errors */
  retryCount: number;
  retryDelayMs: number;
  /** Verbose row-level logging */
  verbose: boolean;
  /** Re-run table(s) even if marked completed in state */
  force: boolean;
}

export function getDefaultLocalDbPath(): string {
  if (process.env.OTTO_SQLITE_PATH) {
    return path.resolve(process.env.OTTO_SQLITE_PATH);
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), ".otto", "data", "db", "otto.sqlite");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    return appData
      ? path.join(appData, "OTTO", "otto.sqlite")
      : path.join(os.homedir(), "AppData", "Roaming", "OTTO", "otto.sqlite");
  }
  return path.join(os.homedir(), ".otto", "data", "db", "otto.sqlite");
}

/**
 * Prefer the richest available local backup when the primary DB has an empty catalog.
 * Desktop users often keep `otto.sqlite` while recovery copies hold production data.
 */
export function resolveSourceDbPath(preferred?: string): string {
  const primary = preferred ?? getDefaultLocalDbPath();
  const candidates = [
    primary,
    `${primary}.corrupt_backup_1771348830`,
    path.join(path.dirname(primary), "otto.sqlite.corrupt_backup_1771348830"),
    `${primary}.backup`,
  ].filter((p, i, arr) => arr.indexOf(p) === i);

  let best = primary;
  let bestScore = -1;

  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      // Lazy require so config can load without better-sqlite3 in unit contexts
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Database = require("better-sqlite3");
      const db = new Database(p, { readonly: true, fileMustExist: true });
      let score = 0;
      for (const t of ["artists", "releases", "tracks", "contracts", "works"]) {
        try {
          score += (db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get() as { n: number }).n;
        } catch {
          /* missing table */
        }
      }
      db.close();
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    } catch {
      /* unreadable */
    }
  }

  return best;
}

export function resolveConfig(
  cliOverrides: Partial<DataMigrateConfig> & { mode?: DataMigrationMode } = {},
): DataMigrateConfig {
  const mode = cliOverrides.mode ?? "inventory";
  const dryRun = cliOverrides.dryRun ?? mode === "dry-run";

  const outputDir =
    cliOverrides.outputDir ?? path.join(process.cwd(), "migration");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Explicit CLI path wins; then OTTO_SQLITE_PATH; else auto-pick richest local backup
  const localDbPath = cliOverrides.localDbPath
    ? path.resolve(cliOverrides.localDbPath)
    : process.env.OTTO_SQLITE_PATH
      ? path.resolve(process.env.OTTO_SQLITE_PATH)
      : resolveSourceDbPath(getDefaultLocalDbPath());

  return {
    mode,
    localDbPath,
    outputDir,
    databaseUrl: process.env.DATABASE_URL,
    cloudOrgUuid:
      process.env.CLOUD_ORG_UUID ??
      cliOverrides.cloudOrgUuid ??
      "00000000-0000-0000-0000-000000000001",
    defaultCloudOrgId: cliOverrides.defaultCloudOrgId,
    dryRun,
    resume: cliOverrides.resume ?? false,
    tableFilter: cliOverrides.tableFilter,
    limit: cliOverrides.limit,
    skipPreflight: cliOverrides.skipPreflight ?? false,
    retryCount: cliOverrides.retryCount ?? 2,
    retryDelayMs: cliOverrides.retryDelayMs ?? 500,
    verbose: cliOverrides.verbose ?? false,
    force: cliOverrides.force ?? false,
  };
}

export function paths(config: DataMigrateConfig) {
  return {
    tableMap: path.join(config.outputDir, "table-map.json"),
    idMap: path.join(config.outputDir, "id-map.json"),
    state: path.join(config.outputDir, "migration-state.json"),
    reportJson: path.join(config.outputDir, "migration-report.json"),
    reportMd: path.join(config.outputDir, "migration-report.md"),
    validation: path.join(config.outputDir, "validation-report.md"),
    dataQuality: path.join(config.outputDir, "data-quality-report.md"),
    sqliteSchema: path.join(config.outputDir, "sqlite-schema.md"),
    postgresSchema: path.join(config.outputDir, "postgres-schema.md"),
    schemaComparison: path.join(config.outputDir, "schema-comparison.md"),
    inventoryJson: path.join(config.outputDir, "inventory.json"),
  };
}
