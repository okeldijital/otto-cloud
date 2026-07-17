#!/usr/bin/env tsx
import { discoverFiles } from "./discover";
import { migrateAssets } from "./migrate";
import { verifyAssets } from "./verify";
import { generateReport } from "./report";
import { requirePreflight } from "./preflight";
import { resolveConfig, MigrationMode } from "./config";

let prismaInstance: any = null;

function getPrisma() {
  if (!prismaInstance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require("@prisma/client");
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

function printUsage(): void {
  console.log(`
Otto Cloud — Local Asset Migration Utility

Usage:
  npx tsx scripts/migrate-assets/index.ts <command> [options]

Commands:
  discover              Scan local storage and build migration-inventory.json
  dry-run               Simulate migration without uploading
  migrate               Upload assets to Otto Cloud Storage and create Attachment records
  verify                Verify uploaded assets and Attachment records
  report                Generate migration-report.json and migration-report.md
  preflight             Run preflight validation checks only

Options:
  --local-db <path>           Path to local SQLite database
  --local-storage <path>      Path to local storage root
  --batch-size <n>            Files per batch (default: 50)
  --concurrency <n>           Parallel upload workers (default: 5)
  --retries <n>               Retry count for transient failures (default: 3)
  --dry-run                   Run in dry-run mode (alias: command "dry-run")
  --no-legacy-update          Do not update legacy file URL fields
  --skip-preflight            Skip automatic preflight validation
  --limit <n>                 Limit migration to first N files (pilot mode)
  --entity <type>             Filter by entity type (artists, releases, tracks, contracts, users, misc)
  --manifest <path>           JSON file listing specific files to migrate
  --help                      Show this help

Environment:
  DATABASE_URL                Cloud PostgreSQL connection string
  R2_BUCKET_NAME              Cloudflare R2 bucket name
  R2_ENDPOINT                 Cloudflare R2 endpoint
  R2_ACCESS_KEY_ID            R2 access key
  R2_SECRET_ACCESS_KEY        R2 secret key
  R2_PUBLIC_URL               Optional public base URL

Examples:
  npx tsx scripts/migrate-assets/index.ts preflight
  npx tsx scripts/migrate-assets/index.ts discover
  npx tsx scripts/migrate-assets/index.ts dry-run
  npx tsx scripts/migrate-assets/index.ts migrate
  npx tsx scripts/migrate-assets/index.ts verify
  npx tsx scripts/migrate-assets/index.ts report

Pilot Examples:
  npx tsx scripts/migrate-assets/index.ts dry-run --limit 40
  npx tsx scripts/migrate-assets/index.ts migrate --entity artists
  npx tsx scripts/migrate-assets/index.ts dry-run --manifest pilot.json
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const command = args[0] as MigrationMode;
  const validCommands: MigrationMode[] = ["discover", "dry-run", "migrate", "verify", "report", "preflight"];
  if (!validCommands.includes(command)) {
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
  }

  const skipPreflight = args.includes("--skip-preflight");
  const cliOverrides: any = { mode: command === "dry-run" ? "dry-run" : command };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--local-db" && args[i + 1]) {
      cliOverrides.localDbPath = args[++i];
    } else if (arg === "--local-storage" && args[i + 1]) {
      cliOverrides.localStorageRoot = args[++i];
    } else if (arg === "--batch-size" && args[i + 1]) {
      cliOverrides.batchSize = parseInt(args[++i], 10);
    } else if (arg === "--concurrency" && args[i + 1]) {
      cliOverrides.concurrency = parseInt(args[++i], 10);
    } else if (arg === "--retries" && args[i + 1]) {
      cliOverrides.retryCount = parseInt(args[++i], 10);
    } else if (arg === "--dry-run") {
      cliOverrides.dryRun = true;
    } else if (arg === "--no-legacy-update") {
      cliOverrides.legacyUpdateFields = false;
    } else if (arg === "--default-org-id" && args[i + 1]) {
      cliOverrides.defaultCloudOrgId = args[++i];
    } else if (arg === "--limit" && args[i + 1]) {
      cliOverrides.pilotLimit = parseInt(args[++i], 10);
    } else if (arg === "--entity" && args[i + 1]) {
      cliOverrides.pilotEntity = args[++i];
    } else if (arg === "--manifest" && args[i + 1]) {
      cliOverrides.pilotManifest = args[++i];
    }
  }

  const config = resolveConfig(cliOverrides);

  try {
    if (command === "preflight") {
      await requirePreflight(config);
      return;
    }

    if (!skipPreflight) {
      const report = await requirePreflight(config);
      if (!report.passed) {
        process.exit(1);
      }
    }

    switch (command) {
      case "discover":
        await discoverFiles({ localStorageRoot: config.localStorageRoot });
        break;
      case "dry-run":
        await migrateAssets({ ...config, dryRun: true, mode: "dry-run" });
        break;
      case "migrate":
        await migrateAssets(config);
        break;
      case "verify":
        await verifyAssets(config);
        break;
      case "report":
        await generateReport(config);
        break;
    }
  } catch (err) {
    console.error(`Fatal error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  } finally {
    if (prismaInstance) {
      await prismaInstance.$disconnect();
    }
  }
}

main();
