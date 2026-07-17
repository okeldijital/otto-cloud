import fs from "fs";
import path from "path";
import { formatBytes } from "./utils";
import { resolveConfig, getStatePath, getReportJsonPath, getReportMdPath, MigrateConfig } from "./config";
import { FileInventoryEntry, MigrationState } from "./utils";

export interface MigrationReport {
  generatedAt: string;
  totalDiscovered: number;
  successfullyMigrated: number;
  failedUploads: number;
  missingLocalFiles: number;
  missingDbReferences: number;
  orphanedFiles: number;
  duplicateFiles: number;
  totalBytesMigrated: number;
  durationMs: number | null;
  failureReasons: Array<{ file: string; reason: string }>;
}

export async function generateReport(configOverride?: Partial<MigrateConfig>): Promise<void> {
  const config = resolveConfig({ ...configOverride, mode: "discover" });
  const statePath = getStatePath(config);

  const inventoryPath = config.mode === "verify" ? undefined : undefined;
  const state = fs.existsSync(statePath)
    ? JSON.parse(fs.readFileSync(statePath, "utf-8")) as MigrationState
    : null;

  const inventory: FileInventoryEntry[] = [];
  const inventoryFile = path.join(config.outputDir, "migration-inventory.json");
  if (fs.existsSync(inventoryFile)) {
    inventory.push(...JSON.parse(fs.readFileSync(inventoryFile, "utf-8")));
  }

  const totalDiscovered = inventory.length;
  const successfullyMigrated = state?.verified.length ?? 0;
  const failedUploads = state?.failed.length ?? 0;
  const missingLocalFiles = inventory.filter((e) => !fs.existsSync(e.localPath)).length;
  const orphanedFiles = inventory.filter((e) => !e.entityType || e.entityType === "misc").length;
  const duplicateFiles = detectDuplicates(inventory).length;
  const totalBytesMigrated = inventory
    .filter((e) => e.status === "verified" || e.status === "uploaded")
    .reduce((sum, e) => sum + e.size, 0);

  const failureReasons = inventory
    .filter((e) => e.status === "failed" && e.error)
    .map((e) => ({ file: e.relativePath, reason: e.error! }));

  const report: MigrationReport = {
    generatedAt: new Date().toISOString(),
    totalDiscovered,
    successfullyMigrated,
    failedUploads,
    missingLocalFiles,
    missingDbReferences: orphanedFiles,
    orphanedFiles,
    duplicateFiles,
    totalBytesMigrated,
    durationMs: null,
    failureReasons,
  };

  const reportJsonPath = getReportJsonPath(config);
  fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), "utf-8");

  const reportMdPath = getReportMdPath(config);
  const md = generateMarkdown(report, state);
  fs.writeFileSync(reportMdPath, md, "utf-8");

  console.log(`[report] JSON: ${reportJsonPath}`);
  console.log(`[report] Markdown: ${reportMdPath}`);
}

function detectDuplicates(inventory: FileInventoryEntry[]): FileInventoryEntry[] {
  const seen = new Map<string, FileInventoryEntry[]>();
  for (const entry of inventory) {
    const key = `${entry.checksum}-${entry.size}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(entry);
  }
  const duplicates: FileInventoryEntry[] = [];
  for (const group of seen.values()) {
    if (group.length > 1) duplicates.push(...group.slice(1));
  }
  return duplicates;
}

function generateMarkdown(report: MigrationReport, state: MigrationState | null): string {
  const lines: string[] = [];
  lines.push("# Otto Cloud — Asset Migration Report");
  lines.push("");
  lines.push(`**Generated:** ${report.generatedAt}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total files discovered | ${report.totalDiscovered} |`);
  lines.push(`| Successfully migrated | ${report.successfullyMigrated} |`);
  lines.push(`| Failed uploads | ${report.failedUploads} |`);
  lines.push(`| Missing local files | ${report.missingLocalFiles} |`);
  lines.push(`| Missing DB references | ${report.missingDbReferences} |`);
  lines.push(`| Orphaned files | ${report.orphanedFiles} |`);
  lines.push(`| Duplicate files | ${report.duplicateFiles} |`);
  lines.push(`| Total bytes migrated | ${formatBytes(report.totalBytesMigrated)} |`);
  lines.push(`| Duration | ${report.durationMs ? `${Math.round(report.durationMs / 1000)}s` : "N/A"} |`);
  lines.push("");

  if (state) {
    lines.push("## State Breakdown");
    lines.push("");
    lines.push(`- **Pending:** ${state.pending.length}`);
    lines.push(`- **Uploaded:** ${state.uploaded.length}`);
    lines.push(`- **Verified:** ${state.verified.length}`);
    lines.push(`- **Failed:** ${state.failed.length}`);
    lines.push("");
  }

  if (report.failureReasons.length > 0) {
    lines.push("## Failures");
    lines.push("");
    for (const fr of report.failureReasons) {
      lines.push(`- **${fr.file}**: ${fr.reason}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
