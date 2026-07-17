import path from "path";
import os from "os";
import fs from "fs";

export type MigrationMode = "discover" | "dry-run" | "migrate" | "verify" | "report" | "preflight";

export interface MigrateConfig {
  mode: MigrationMode;
  localDbPath: string;
  localStorageRoot: string;
  batchSize: number;
  concurrency: number;
  retryCount: number;
  retryDelayMs: number;
  dryRun: boolean;
  verifyAfterUpload: boolean;
  orgMappingPath: string;
  outputDir: string;
  legacyUpdateFields: boolean;
  defaultCloudOrgId?: string;
  pilotLimit?: number;
  pilotEntity?: string;
  pilotManifest?: string;
}

export function getDefaultLocalDbPath(): string {
  const platform = process.platform;
  if (platform === "darwin") {
    return path.join(os.homedir(), ".otto", "data", "db", "otto.sqlite");
  } else if (platform === "win32") {
    const appData = process.env.APPDATA;
    return appData ? path.join(appData, "OTTO", "otto.sqlite") : path.join(os.homedir(), "AppData", "Roaming", "OTTO", "otto.sqlite");
  } else {
    return path.join(os.homedir(), ".otto", "data", "db", "otto.sqlite");
  }
}

export function getDefaultLocalStorageRoot(): string {
  const platform = process.platform;
  if (platform === "darwin") {
    return path.join(os.homedir(), ".otto", "data", "storage");
  } else if (platform === "win32") {
    const appData = process.env.APPDATA;
    return appData ? path.join(appData, "OTTO", "storage") : path.join(os.homedir(), "AppData", "Roaming", "OTTO", "storage");
  } else {
    return path.join(os.homedir(), ".otto", "data", "storage");
  }
}

export function resolveConfig(cliOverrides: Partial<MigrateConfig> = {}): MigrateConfig {
  const mode = cliOverrides.mode ?? "discover";
  const dryRun = cliOverrides.dryRun ?? (mode === "dry-run");
  const verifyAfterUpload = cliOverrides.verifyAfterUpload ?? (mode === "verify");

  const localDbPath = cliOverrides.localDbPath ?? getDefaultLocalDbPath();
  const localStorageRoot = cliOverrides.localStorageRoot ?? getDefaultLocalStorageRoot();
  const orgMappingPath =
    cliOverrides.orgMappingPath ??
    path.join(process.cwd(), "scripts", "migrate-assets", "org-mapping.json");

  const outputDir = cliOverrides.outputDir ?? path.join(process.cwd(), "scripts", "migrate-assets");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return {
    mode,
    localDbPath,
    localStorageRoot,
    batchSize: cliOverrides.batchSize ?? 50,
    concurrency: cliOverrides.concurrency ?? 5,
    retryCount: cliOverrides.retryCount ?? 3,
    retryDelayMs: cliOverrides.retryDelayMs ?? 1000,
    dryRun,
    verifyAfterUpload,
    orgMappingPath,
    outputDir,
    legacyUpdateFields: cliOverrides.legacyUpdateFields ?? true,
    defaultCloudOrgId: cliOverrides.defaultCloudOrgId,
    pilotLimit: cliOverrides.pilotLimit,
    pilotEntity: cliOverrides.pilotEntity,
    pilotManifest: cliOverrides.pilotManifest,
  };
}

export function getInventoryPath(config: MigrateConfig): string {
  return path.join(config.outputDir, "migration-inventory.json");
}

export function getStatePath(config: MigrateConfig): string {
  return path.join(config.outputDir, "migration-state.json");
}

export function getReportJsonPath(config: MigrateConfig): string {
  return path.join(config.outputDir, "migration-report.json");
}

export function getReportMdPath(config: MigrateConfig): string {
  return path.join(config.outputDir, "migration-report.md");
}
