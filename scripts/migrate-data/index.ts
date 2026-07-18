#!/usr/bin/env tsx
/**
 * Otto Cloud — Legacy Desktop → Cloud Data Migration Framework
 *
 * Reusable platform capability for migrating any Otto desktop customer
 * into Otto Cloud (PostgreSQL / Neon).
 *
 * Commands:
 *   preflight | inventory | profile | dry-run | migrate | verify | report | link-attachments
 *
 * Options:
 *   --table <name>   --limit <n>   --resume   --dry-run
 *   --local-db <path>   --skip-preflight   --verbose
 */

import fs from "fs";
import path from "path";
import { resolveConfig, type DataMigrationMode } from "./config";

/** Load .env without requiring the dotenv package */
function loadEnvFile(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();
import { requirePreflight, runPreflight } from "./preflight";
import { runInventory, runDataQualityProfile } from "./inventory";
import { MigrationEngine } from "./engine";
import { resolveMigrationPlan } from "./migrate/registry";
import { loadState, saveState, emptyState } from "./state";
import { runVerify } from "./verify";
import { generateReport } from "./report";
import { linkAttachments } from "./attachments";
import { log, error, formatDuration } from "./utils";

function printUsage(): void {
  console.log(`
Otto Cloud — Legacy Data Migration Framework

Usage:
  npx tsx scripts/migrate-data/index.ts <command> [options]

Commands:
  preflight           Validate SQLite + Postgres connectivity
  inventory           Discover schemas, write table-map + schema docs
  profile             Data quality profiling (nulls, orphans, dups)
  dry-run             Transform + plan without writing Postgres
  migrate             Import business data (idempotent, resumable)
  verify              Compare SQLite vs Postgres counts + FK spot-checks
  report              Write migration-report.json / .md
  link-attachments    Link existing Attachment rows (no re-upload)

Options:
  --local-db <path>   Source SQLite (default: auto-pick richest ~/.otto DB)
  --table <name>      Only process one table
  --limit <n>         Max rows per table (pilot)
  --resume            Skip completed tables from migration-state.json
  --force             Re-run even if table marked completed
  --dry-run           Alias for dry-run mode on migrate
  --skip-preflight    Skip connectivity checks
  --verbose           Per-row logging
  --help

Environment:
  DATABASE_URL        Neon / Postgres connection
  OTTO_SQLITE_PATH    Override source SQLite path
  CLOUD_ORG_UUID      UUID for string organization_id columns

npm scripts:
  npm run migrate:data:inventory
  npm run migrate:data:profile
  npm run migrate:data:dry-run
  npm run migrate:data
  npm run migrate:data:verify
  npm run migrate:data:report
`);
}

function parseArgs(argv: string[]): {
  mode: DataMigrationMode;
  overrides: Parameters<typeof resolveConfig>[0];
} {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const mode = argv[0] as DataMigrationMode;
  const valid: DataMigrationMode[] = [
    "preflight",
    "inventory",
    "profile",
    "dry-run",
    "migrate",
    "verify",
    "report",
    "link-attachments",
  ];
  if (!valid.includes(mode)) {
    error(`Unknown command: ${mode}`);
    printUsage();
    process.exit(1);
  }

  const overrides: Parameters<typeof resolveConfig>[0] = { mode };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--local-db" && argv[i + 1]) overrides.localDbPath = argv[++i];
    else if (a === "--table" && argv[i + 1]) overrides.tableFilter = argv[++i];
    else if (a === "--limit" && argv[i + 1])
      overrides.limit = parseInt(argv[++i]!, 10);
    else if (a === "--resume") overrides.resume = true;
    else if (a === "--force") overrides.force = true;
    else if (a === "--dry-run") overrides.dryRun = true;
    else if (a === "--skip-preflight") overrides.skipPreflight = true;
    else if (a === "--verbose") overrides.verbose = true;
  }

  if (mode === "dry-run") overrides.dryRun = true;
  if (mode === "migrate" && overrides.dryRun) {
    // keep dry-run flag
  }

  return { mode, overrides };
}

async function runMigrate(config: ReturnType<typeof resolveConfig>): Promise<void> {
  await requirePreflight(config);

  // Ensure table-map exists (skip full rediscovery on targeted repairs if present)
  const tableMapPath = path.join(config.outputDir, "table-map.json");
  if (!fs.existsSync(tableMapPath) || (!config.tableFilter && !config.force)) {
    try {
      await runInventory(config);
    } catch (e: any) {
      error(`Inventory failed: ${e.message}`);
      throw e;
    }
  } else {
    log("Using existing table-map.json (repair mode)");
  }

  // Full wipe only on clean full migrate (no resume / table / force)
  const isRepair = Boolean(config.resume || config.tableFilter || config.force);
  let state = isRepair
    ? loadState({ ...config, resume: true })
    : emptyState(config.localDbPath);
  if (config.tableFilter && state.tables[config.tableFilter]) {
    state.tables[config.tableFilter]!.status = "pending";
  }
  saveState(config, state);

  const plan = resolveMigrationPlan(config);
  log(
    `Plan: ${plan.length} tables${config.tableFilter ? ` (filter=${config.tableFilter})` : ""}${config.dryRun ? " [DRY-RUN]" : ""}${config.force ? " [FORCE]" : ""}`,
  );

  const engine = new MigrationEngine(config);
  const t0 = Date.now();
  try {
    await engine.init();
    await engine.runTables(plan, state);
    saveState(config, state);
    log(`Finished in ${formatDuration(Date.now() - t0)}`);
  } finally {
    await engine.close();
  }

  generateReport(config);
}

async function main(): Promise<void> {
  const { mode, overrides } = parseArgs(process.argv.slice(2));
  const config = resolveConfig(overrides);

  log(`Command: ${mode}`);
  log(`SQLite:  ${config.localDbPath}`);
  log(`Output:  ${config.outputDir}`);

  try {
    switch (mode) {
      case "preflight":
        await runPreflight(config);
        break;
      case "inventory":
        await runInventory(config);
        break;
      case "profile":
        await requirePreflight(config);
        await runDataQualityProfile(config);
        break;
      case "dry-run":
        await runMigrate({ ...config, dryRun: true, mode: "dry-run" });
        break;
      case "migrate":
        await runMigrate(config);
        break;
      case "verify":
        await requirePreflight(config);
        await runVerify(config);
        break;
      case "report":
        generateReport(config);
        break;
      case "link-attachments":
        await requirePreflight(config);
        await linkAttachments(config);
        break;
      default:
        printUsage();
        process.exit(1);
    }
  } catch (e: any) {
    error(e.message || e);
    if (e.stack) error(e.stack);
    process.exit(1);
  }
}

main();
