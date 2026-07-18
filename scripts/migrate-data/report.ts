/**
 * Phase 9 — migration report generation.
 */

import type { DataMigrateConfig } from "./config";
import { paths } from "./config";
import { readJson, writeJson, writeText, log, formatDuration, maskDatabaseUrl } from "./utils";
import type { MigrationStateFile } from "./state";
import type { IdMapFile } from "./mapping";

export function generateReport(config: DataMigrateConfig): void {
  const out = paths(config);
  const state = readJson<MigrationStateFile | null>(out.state, null);
  const idMap = readJson<IdMapFile | null>(out.idMap, null);

  const report = {
    generatedAt: new Date().toISOString(),
    sourceDbPath: config.localDbPath,
    targetDatabase: maskDatabaseUrl(config.databaseUrl),
    dryRun: config.dryRun,
    resume: config.resume,
    state,
    idMapSummary: idMap
      ? Object.fromEntries(
          Object.entries(idMap.maps ?? {}).map(([k, v]) => [k, Object.keys(v).length]),
        )
      : {},
  };

  writeJson(out.reportJson, report);

  let md = `# Legacy Data Migration Report\n\n`;
  md += `**Generated:** ${report.generatedAt}\n\n`;
  md += `## Configuration\n\n`;
  md += `| Key | Value |\n|-----|-------|\n`;
  md += `| Source SQLite | \`${config.localDbPath}\` |\n`;
  md += `| Target | \`${maskDatabaseUrl(config.databaseUrl)}\` |\n`;
  md += `| Dry run | ${config.dryRun} |\n`;
  md += `| Resume | ${config.resume} |\n`;

  if (state) {
    md += `\n## Totals\n\n`;
    md += `| Metric | Count |\n|--------|------:|\n`;
    md += `| Source rows (sum) | ${state.totals.sourceCount} |\n`;
    md += `| Imported | ${state.totals.imported} |\n`;
    md += `| Skipped | ${state.totals.skipped} |\n`;
    md += `| Errors | ${state.totals.errors} |\n`;
    md += `| Completed tables | ${state.completedTables.length} |\n`;

    md += `\n## Per-table\n\n`;
    md += `| Table | Status | Source | Imported | Skipped | Errors | Duration |\n`;
    md += `|-------|--------|-------:|---------:|--------:|-------:|---------:|\n`;
    for (const [name, t] of Object.entries(state.tables)) {
      md += `| ${name} | ${t.status} | ${t.sourceCount} | ${t.imported} | ${t.skipped} | ${t.errors} | ${t.elapsedMs != null ? formatDuration(t.elapsedMs) : "—"} |\n`;
    }

    md += `\n## Warnings\n\n`;
    const failed = Object.entries(state.tables).filter(
      ([, t]) => t.status === "failed" || t.errors > 0,
    );
    if (failed.length === 0) md += `_No failed tables._\n`;
    for (const [name, t] of failed) {
      md += `- **${name}**: ${t.errors} errors${t.lastError ? ` — ${t.lastError}` : ""}\n`;
    }
  } else {
    md += `\n_No migration-state.json yet. Run \`npm run migrate:data\` first._\n`;
  }

  md += `\n## ID map entities\n\n`;
  if (report.idMapSummary && Object.keys(report.idMapSummary).length) {
    for (const [k, n] of Object.entries(report.idMapSummary)) {
      md += `- ${k}: ${n} ids\n`;
    }
  } else {
    md += `_Empty — migration not yet run._\n`;
  }

  md += `\n## Artifacts\n\n`;
  md += `- \`migration/table-map.json\`\n`;
  md += `- \`migration/id-map.json\`\n`;
  md += `- \`migration/migration-state.json\`\n`;
  md += `- \`migration/validation-report.md\`\n`;
  md += `- \`migration/data-quality-report.md\`\n`;
  md += `- \`migration/sqlite-schema.md\`\n`;
  md += `- \`migration/schema-comparison.md\`\n`;

  writeText(out.reportMd, md);
  log(`Wrote ${out.reportJson}`);
  log(`Wrote ${out.reportMd}`);
}
