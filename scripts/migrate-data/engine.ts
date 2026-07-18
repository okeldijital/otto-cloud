/**
 * Core migration engine — transforms SQLite rows into Prisma writes.
 * Idempotent upserts preserve integer IDs when possible.
 */

import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import type { DataMigrateConfig } from "./config";
import { IdMapper } from "./mapping";
import {
  TABLE_CONFIG,
  INT_ORG_MODELS,
  identityEntityFor,
  prismaDelegateFor,
  type TableConfig,
} from "./table-config";
import {
  parseJson,
  toDate,
  toBool,
  looksLikeDateColumn,
  looksLikeJsonColumn,
  looksLikeBoolColumn,
  log,
  warn,
  error,
  sleep,
} from "./utils";
import type { MigrationStateFile, TableState } from "./state";
import { isTableComplete, saveState } from "./state";

export interface RowResult {
  status: "imported" | "skipped" | "error";
  sourceId?: unknown;
  destId?: unknown;
  reason?: string;
  durationMs?: number;
  retries?: number;
}

export class MigrationEngine {
  prisma = new PrismaClient();
  sqlite!: Database.Database;
  idMapper: IdMapper;

  dbToField: Record<string, Map<string, string>> = {};
  fieldTypes: Record<string, Map<string, string>> = {};
  prismaFields: Record<string, Set<string>> = {};

  skippedRecords: Array<{ table: string; id: unknown; reason: string }> = [];
  errorDetails: Array<{
    table: string;
    id: unknown;
    message: string;
    stack?: string;
  }> = [];

  constructor(public config: DataMigrateConfig) {
    this.idMapper = new IdMapper(config);
  }

  async init(): Promise<void> {
    this.sqlite = new Database(this.config.localDbPath, {
      readonly: true,
      fileMustExist: true,
    });
    log(`Source SQLite: ${this.config.localDbPath}`);
    this.buildPrismaFieldInfo();
  }

  private buildPrismaFieldInfo(): void {
    const dm = (
      this.prisma as unknown as {
        _runtimeDataModel: { models: Record<string, { fields: any[] }> };
      }
    )._runtimeDataModel;
    for (const [modelName, model] of Object.entries(dm.models)) {
      const dbToField = new Map<string, string>();
      const fieldTypes = new Map<string, string>();
      const writable = new Set<string>();
      for (const field of model.fields) {
        if (field.kind !== "scalar" && field.kind !== "enum") continue;
        const dbName = field.dbName ?? field.name;
        dbToField.set(dbName, field.name);
        dbToField.set(field.name, field.name);
        fieldTypes.set(field.name, field.type ?? "String");
        writable.add(field.name);
      }
      this.dbToField[modelName] = dbToField;
      this.fieldTypes[modelName] = fieldTypes;
      this.prismaFields[modelName] = writable;
      const alias = modelName.toLowerCase();
      if (alias !== modelName) {
        this.dbToField[alias] = dbToField;
        this.fieldTypes[alias] = fieldTypes;
        this.prismaFields[alias] = writable;
      }
      // users table alias for User model
      if (modelName === "User") {
        this.dbToField.users = dbToField;
        this.fieldTypes.users = fieldTypes;
        this.prismaFields.users = writable;
      }
    }
  }

  getConfig(table: string): TableConfig {
    return TABLE_CONFIG[table] ?? {};
  }

  /** Default integer org for orphan FK remaps (Proton / first migrated org). */
  private resolveFallbackOrgId(): number {
    if (this.config.defaultCloudOrgId != null) return this.config.defaultCloudOrgId;
    const fromMap = this.idMapper.get("organizations", 1);
    if (typeof fromMap === "number") return fromMap;
    // Prefer id 1 if present in map values
    const orgMap = this.idMapper.getNumberMap("organizations");
    if (orgMap.has(1)) return 1;
    const first = [...orgMap.values()][0];
    if (first != null) return first;
    return 1;
  }

  /** Unique string columns: empty string → null to avoid multi-row '' unique violations. */
  private sanitizeUniqueEmpties(
    table: string,
    clean: Record<string, unknown>,
  ): void {
    const uniqueStringFields: Record<string, string[]> = {
      artists: ["artist_id", "name"],
      releases: ["release_id", "upc_code", "catalog_number"],
      contracts: ["contract_number"],
    };
    for (const f of uniqueStringFields[table] ?? []) {
      if (clean[f] === "") clean[f] = null;
    }
    // name is required on artists — never null
    if (table === "artists" && (clean.name == null || clean.name === "")) {
      clean.name = `Artist ${clean.id ?? "unknown"}`;
    }
  }

  sourceTableExists(source: string): boolean {
    const row = this.sqlite
      .prepare(
        `SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name = ?`,
      )
      .get(source);
    return Boolean(row);
  }

  countSource(source: string): number {
    if (!this.sourceTableExists(source)) return 0;
    return (
      this.sqlite.prepare(`SELECT COUNT(*) AS n FROM "${source}"`).get() as {
        n: number;
      }
    ).n;
  }

  private resolveTargetFields(
    table: string,
    sample: Record<string, unknown>,
  ): Set<string> {
    const cfg = this.getConfig(table);
    const drop = new Set(cfg.dropFields ?? []);
    const rename = cfg.renameFields ?? {};
    const dbToField = this.dbToField[table] ?? this.dbToField[prismaDelegateFor(table)] ?? new Map();
    const writable =
      this.prismaFields[table] ??
      this.prismaFields[prismaDelegateFor(table)] ??
      new Set<string>();

    const target = new Set<string>();
    for (const col of Object.keys(sample)) {
      if (drop.has(col)) continue;
      if (rename[col]) {
        if (writable.has(rename[col])) target.add(rename[col]);
        continue;
      }
      const field = dbToField.get(col);
      if (field && writable.has(field)) target.add(field);
    }
    // Always allow id for preserve-id upserts
    if (writable.has("id")) target.add("id");
    return target;
  }

  transformRow(
    table: string,
    raw: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const cfg = this.getConfig(table);
    const rename = cfg.renameFields ?? {};
    const drop = new Set(cfg.dropFields ?? []);
    const jsonFields = new Set(cfg.jsonFields ?? []);
    const dateFields = new Set(cfg.dateFields ?? []);
    const boolFields = new Set(cfg.boolFields ?? []);
    const dbToField =
      this.dbToField[table] ??
      this.dbToField[prismaDelegateFor(table)] ??
      new Map();
    const fieldTypes =
      this.fieldTypes[table] ??
      this.fieldTypes[prismaDelegateFor(table)] ??
      new Map();
    const writable =
      this.prismaFields[table] ??
      this.prismaFields[prismaDelegateFor(table)] ??
      new Set<string>();

    const out: Record<string, unknown> = {};

    for (const [col, value] of Object.entries(raw)) {
      if (drop.has(col)) continue;

      let prismaName = rename[col] ?? dbToField.get(col) ?? col;
      if (writable.size > 0 && !writable.has(prismaName) && prismaName !== "id") {
        continue;
      }

      if (prismaName === "organization_id" || col === "organization_id") {
        if (INT_ORG_MODELS.has(table)) {
          if (value === null || value === undefined) {
            // Required on contracts — fall back to default org
            out.organization_id = this.resolveFallbackOrgId();
            continue;
          }
          const srcOrg = value as number;
          // PostgreSQL INTEGER max — snowflake-style desktop ids cannot be stored as-is
          const INT_MAX = 2147483647;
          let mapped = this.idMapper.get("organizations", srcOrg);
          if (mapped === undefined) {
            // Orphan org references (test smoke orgs, missing rows) → fallback
            mapped = this.resolveFallbackOrgId();
            this.idMapper.set("organizations", srcOrg, mapped);
            if (this.config.verbose) {
              warn(
                `${table} id=${raw.id}: org ${srcOrg} unmapped/oversize → fallback org ${mapped}`,
              );
            }
          } else if (typeof mapped === "number" && mapped > INT_MAX) {
            mapped = this.resolveFallbackOrgId();
            this.idMapper.set("organizations", srcOrg, mapped);
          }
          out.organization_id = mapped;
        } else if (writable.has("organization_id")) {
          out.organization_id = this.config.cloudOrgUuid;
        }
        continue;
      }

      const fk = cfg.fk?.[col];
      if (fk) {
        if (value === null || value === undefined) {
          out[prismaName] = null;
          continue;
        }
        const mapped = this.idMapper.get(fk.entity, value as number | string);
        if (mapped === undefined) {
          if (fk.required) {
            this.skippedRecords.push({
              table,
              id: raw.id,
              reason: `required FK ${col}=${value} not in id-map (${fk.entity})`,
            });
            return null;
          }
          out[prismaName] = null;
          continue;
        }
        out[prismaName] = mapped;
        continue;
      }

      const type = fieldTypes.get(prismaName);
      if (
        type === "Json" ||
        jsonFields.has(col) ||
        (type === undefined && looksLikeJsonColumn(col))
      ) {
        out[prismaName] = parseJson(value);
        continue;
      }
      if (
        type === "DateTime" ||
        dateFields.has(col) ||
        (type === undefined && looksLikeDateColumn(col))
      ) {
        out[prismaName] = toDate(value);
        continue;
      }
      if (
        type === "Boolean" ||
        boolFields.has(col) ||
        (type === undefined && looksLikeBoolColumn(col))
      ) {
        out[prismaName] = toBool(value);
        continue;
      }

      out[prismaName] = value;
    }

    if (cfg.staticFields) {
      for (const [k, v] of Object.entries(cfg.staticFields)) {
        out[k] = typeof v === "function" ? (v as () => unknown)() : v;
      }
    }

    if (cfg.transform) {
      return cfg.transform(out, {
        idMapper: this.idMapper,
        cloudOrgUuid: this.config.cloudOrgUuid,
      });
    }
    return out;
  }

  async migrateTable(
    table: string,
    source: string,
    state: MigrationStateFile,
  ): Promise<TableState> {
    const started = Date.now();
    const tableState: TableState = {
      status: "in_progress",
      sourceCount: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      retries: 0,
      startedAt: new Date().toISOString(),
    };

    const delegateKey = prismaDelegateFor(table);
    const delegate = (this.prisma as unknown as Record<string, any>)[delegateKey];
    if (!delegate || typeof delegate.create !== "function") {
      warn(`No Prisma delegate for "${table}" (key=${delegateKey}) — skipped.`);
      tableState.status = "skipped";
      tableState.completedAt = new Date().toISOString();
      state.tables[table] = tableState;
      saveState(this.config, state);
      return tableState;
    }

    if (!this.sourceTableExists(source)) {
      log(`${table}: source "${source}" missing — skip`);
      tableState.status = "skipped";
      tableState.completedAt = new Date().toISOString();
      state.tables[table] = tableState;
      saveState(this.config, state);
      return tableState;
    }

    let rows = this.sqlite
      .prepare(`SELECT * FROM "${source}"`)
      .all() as Record<string, unknown>[];
    tableState.sourceCount = rows.length;

    if (this.config.limit && this.config.limit > 0) {
      rows = rows.slice(0, this.config.limit);
    }

    if (rows.length === 0) {
      log(`${table}: 0 rows`);
      tableState.status = "completed";
      tableState.completedAt = new Date().toISOString();
      tableState.elapsedMs = Date.now() - started;
      state.tables[table] = tableState;
      saveState(this.config, state);
      return tableState;
    }

    const targetFields = this.resolveTargetFields(table, rows[0]!);
    const cfg = this.getConfig(table);
    const preserveId = cfg.preserveId !== false;
    const identity = identityEntityFor(table);

    for (const raw of rows) {
      const rowStart = Date.now();
      let retries = 0;
      let done = false;

      while (!done && retries <= this.config.retryCount) {
        try {
          const payload = this.transformRow(table, raw);
          if (payload === null) {
            tableState.skipped += 1;
            done = true;
            break;
          }

          const clean: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(payload)) {
            if (targetFields.has(k)) clean[k] = v;
          }
          this.sanitizeUniqueEmpties(table, clean);

          const srcId = raw.id as number | undefined;

          if (this.config.dryRun) {
            if (this.config.verbose) {
              log(
                `dry-run ${table} id=${srcId} fields=${Object.keys(clean).length}`,
              );
            }
            tableState.imported += 1;
            if (identity && srcId !== undefined) {
              this.idMapper.set(identity, srcId, srcId);
            }
            done = true;
            break;
          }

          // Already migrated with correct identity mapping? Idempotent skip
          if (
            identity &&
            srcId !== undefined &&
            this.idMapper.get(identity, srcId) != null &&
            preserveId
          ) {
            const existingId = this.idMapper.get(identity, srcId);
            try {
              const found = await delegate.findUnique({
                where: { id: existingId },
              });
              if (found) {
                // Update in place (repair)
                const { id: _id, ...rest } = clean;
                await delegate.update({
                  where: { id: existingId },
                  data: rest,
                });
                tableState.imported += 1;
                done = true;
                break;
              }
            } catch {
              /* fall through to upsert */
            }
          }

          if (preserveId && typeof srcId === "number") {
            clean.id = srcId;
            await delegate.upsert({
              where: { id: srcId },
              create: clean,
              update: (() => {
                const { id: _id, ...rest } = clean;
                return rest;
              })(),
            });
            if (identity) this.idMapper.set(identity, srcId, srcId);
          } else {
            const created = await delegate.create({ data: clean });
            if (identity && srcId !== undefined && created?.id != null) {
              this.idMapper.set(identity, srcId, created.id);
            }
          }

          tableState.imported += 1;
          if (this.config.verbose) {
            log(
              `${table} id=${srcId} ok ${Date.now() - rowStart}ms retries=${retries}`,
            );
          }
          done = true;
        } catch (e: any) {
          const msg = e.message || String(e);
          if (
            retries < this.config.retryCount &&
            /timeout|ECONNRESET|deadlock|could not serialize/i.test(msg)
          ) {
            retries += 1;
            tableState.retries += 1;
            await sleep(this.config.retryDelayMs * retries);
            continue;
          }

          // Artists: unique name → map source id to existing cloud artist
          if (
            table === "artists" &&
            /Unique|unique|duplicate/i.test(msg) &&
            typeof raw.id === "number"
          ) {
            try {
              const name =
                (raw.name as string) ||
                (e.meta as any)?.target ||
                String(raw.id);
              const existing = await this.prisma.artists.findFirst({
                where: { name: String(raw.name ?? name) },
              });
              if (existing) {
                this.idMapper.set("artists", raw.id, existing.id);
                tableState.skipped += 1;
                this.skippedRecords.push({
                  table,
                  id: raw.id,
                  reason: `name collision → mapped to artist id ${existing.id}`,
                });
                done = true;
                continue;
              }
            } catch {
              /* fall through */
            }
          }

          // Releases: unique upc/catalog → null those and retry once
          if (
            table === "releases" &&
            /Unique|unique|duplicate/i.test(msg) &&
            retries < this.config.retryCount + 1
          ) {
            retries += 1;
            // force null unique fields on next attempt via mutating raw
            (raw as any).__null_uniques = true;
            if ((raw as any).__null_uniques) {
              // apply on transform path by clearing source unique cols
              raw.upc_code = null;
              raw.catalog_number = null;
              // release_id keep if possible; if conflict null it
              if (/release_id|upc|catalog/i.test(msg)) {
                if (/upc/i.test(msg)) raw.upc_code = null;
                if (/catalog/i.test(msg)) raw.catalog_number = null;
                if (/release_id/i.test(msg)) raw.release_id = null;
              }
              await sleep(50);
              continue;
            }
          }

          // Releases / contracts: FK failures → null optional FKs and retry
          if (
            (table === "releases" || table === "contracts") &&
            /Foreign key|foreign key/i.test(msg) &&
            retries < this.config.retryCount + 1
          ) {
            retries += 1;
            if (table === "releases") {
              raw.artist_id = null;
              // keep label/distributor if possible; null on second FK fail
              if (retries > 1) {
                raw.label_id = null;
                raw.distributor_id = null;
              }
            }
            if (table === "contracts") {
              raw.created_by = null;
            }
            await sleep(50);
            continue;
          }

          if (/Unique|unique|duplicate/i.test(msg)) {
            tableState.skipped += 1;
            this.skippedRecords.push({
              table,
              id: raw.id,
              reason: `duplicate: ${msg.slice(0, 160)}`,
            });
            // Map identity when same-id already exists
            if (identity && typeof raw.id === "number") {
              try {
                const found = await (this.prisma as any)[
                  prismaDelegateFor(table)
                ].findUnique({ where: { id: raw.id } });
                if (found) this.idMapper.set(identity, raw.id, raw.id);
              } catch {
                /* ignore */
              }
            }
          } else if (/Foreign key|violates not-null|null value/i.test(msg)) {
            tableState.skipped += 1;
            this.skippedRecords.push({
              table,
              id: raw.id,
              reason: `constraint: ${msg.slice(0, 160)}`,
            });
          } else {
            tableState.errors += 1;
            this.errorDetails.push({
              table,
              id: raw.id,
              message: msg.slice(0, 400),
              stack: e.stack,
            });
            if (this.config.verbose) {
              error(`${table} id=${raw.id}: ${msg.slice(0, 200)}`);
            }
          }
          done = true;
        }
      }
    }

    tableState.status = tableState.errors > 0 && tableState.imported === 0 ? "failed" : "completed";
    tableState.completedAt = new Date().toISOString();
    tableState.elapsedMs = Date.now() - started;
    state.tables[table] = tableState;
    this.idMapper.save();
    saveState(this.config, state);

    log(
      `${table}: source=${tableState.sourceCount} imported=${tableState.imported} skipped=${tableState.skipped} errors=${tableState.errors} (${tableState.elapsedMs}ms)`,
    );
    return tableState;
  }

  async runTables(
    tables: Array<{ key: string; source: string }>,
    state: MigrationStateFile,
  ): Promise<void> {
    for (const { key, source } of tables) {
      if (this.config.tableFilter && this.config.tableFilter !== key) continue;
      // --table or --force always re-runs; --resume alone skips completed
      const forceThis =
        this.config.force || Boolean(this.config.tableFilter);
      if (
        this.config.resume &&
        !forceThis &&
        isTableComplete(state, key)
      ) {
        log(`resume: skip completed ${key}`);
        continue;
      }
      await this.migrateTable(key, source, state);
    }
  }

  async close(): Promise<void> {
    try {
      this.sqlite?.close();
    } catch {
      /* ignore */
    }
    await this.prisma.$disconnect();
  }
}
