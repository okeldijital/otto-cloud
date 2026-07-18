/**
 * Resume-safe migration state.
 */

import { readJson, writeJson } from "./utils";
import type { DataMigrateConfig } from "./config";
import { paths } from "./config";

export interface TableState {
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  sourceCount: number;
  imported: number;
  skipped: number;
  errors: number;
  retries: number;
  startedAt?: string;
  completedAt?: string;
  lastError?: string;
  elapsedMs?: number;
}

export interface MigrationStateFile {
  version: 1;
  sourceDbPath: string;
  startedAt: string;
  updatedAt: string;
  completedTables: string[];
  tables: Record<string, TableState>;
  totals: {
    imported: number;
    skipped: number;
    errors: number;
    sourceCount: number;
  };
}

export function emptyState(sourceDbPath: string): MigrationStateFile {
  const now = new Date().toISOString();
  return {
    version: 1,
    sourceDbPath,
    startedAt: now,
    updatedAt: now,
    completedTables: [],
    tables: {},
    totals: { imported: 0, skipped: 0, errors: 0, sourceCount: 0 },
  };
}

export function loadState(config: DataMigrateConfig): MigrationStateFile {
  const p = paths(config).state;
  const fallback = emptyState(config.localDbPath);
  if (!config.resume) return fallback;
  const loaded = readJson<MigrationStateFile>(p, fallback);
  if (loaded.sourceDbPath && loaded.sourceDbPath !== config.localDbPath) {
    // Different customer/DB — start fresh unless forced
    return fallback;
  }
  return loaded;
}

export function saveState(config: DataMigrateConfig, state: MigrationStateFile): void {
  state.updatedAt = new Date().toISOString();
  // recompute totals
  const totals = { imported: 0, skipped: 0, errors: 0, sourceCount: 0 };
  const completed: string[] = [];
  for (const [name, t] of Object.entries(state.tables)) {
    totals.imported += t.imported;
    totals.skipped += t.skipped;
    totals.errors += t.errors;
    totals.sourceCount += t.sourceCount;
    if (t.status === "completed") completed.push(name);
  }
  state.totals = totals;
  state.completedTables = completed;
  writeJson(paths(config).state, state);
}

export function isTableComplete(state: MigrationStateFile, table: string): boolean {
  return state.tables[table]?.status === "completed";
}
