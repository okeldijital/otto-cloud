#!/usr/bin/env node
const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const os = require('os');
const fs = require('fs');

const DRY_RUN = process.argv.includes('--dry-run');
const SOURCE_DB = path.join(os.homedir(), '.otto/data/db/otto.sqlite');
const ORG_UUID = '00000000-0000-0000-0000-000000000001';

if (!fs.existsSync(SOURCE_DB)) {
  console.error(`Source database not found: ${SOURCE_DB}`);
  process.exit(1);
}

const source = new Database(SOURCE_DB);
const prisma = new PrismaClient();

const stats = { imported: 0, skipped: 0, errors: 0, details: {} };
const orgIdMap = new Map(); // desktop organization_id → organizations.id

function log(msg) { console.log(`[${DRY_RUN ? 'DRY-RUN' : 'IMPORT'}] ${msg}`); }
function warn(msg) { console.warn(`  ⚠ ${msg}`); }
function error(msg) { console.error(`  ✗ ${msg}`); stats.errors++; }
function success(msg) { console.log(`  ✓ ${msg}`); }

function mapOrg(orgId) {
  return ORG_UUID;
}

const JSON_FIELDS = new Set([
  'artist_ids', 'credits', 'tags', 'changes', 'banking_details',
  'streaming_links', 'social_media', 'attachments',
]);

const BOOL_FIELDS = new Set([
  'is_deleted', 'is_active', 'is_superuser', 'exclusivity', 'all_day', 'pinned',
  'requires_user_review',
]);

const DATE_KEYS = new Set([
  'statement_date', 'release_date', 'start_date', 'end_date', 'signed_date',
  'timestamp',
]);

function cleanRow(row, tableConfig) {
  const cleaned = { ...row };
  for (const [key, value] of Object.entries(cleaned)) {
    if (value && typeof value === 'string' && JSON_FIELDS.has(key)) {
      try { cleaned[key] = JSON.parse(value); } catch (e) { /* keep as string */ }
    }
    if (value && typeof value === 'string' && (key.endsWith('_at') || DATE_KEYS.has(key))) {
      cleaned[key] = new Date(value);
    }
    if (BOOL_FIELDS.has(key)) {
      cleaned[key] = Boolean(value);
    }
  }

  if (tableConfig.orgField && tableConfig.orgType === 'uuid') {
    cleaned[tableConfig.orgField] = mapOrg(row[tableConfig.orgField]);
  }
  if (tableConfig.orgField && tableConfig.orgType === 'int') {
    const original = cleaned[tableConfig.orgField];
    if (original != null) {
      const mapped = orgIdMap.get(original);
      if (mapped !== undefined) {
        cleaned[tableConfig.orgField] = mapped;
      }
    }
  }

  return cleaned;
}

const TABLE_CONFIGS = [
  {
    table: 'organizations', prisma: 'organizations', orgField: 'organization_id', orgType: 'int',
    transform: (r) => {
      orgIdMap.set(r.organization_id, r.id);
      return { ...r, organization_id: r.id };
    },
  },
  {
    table: 'users', prisma: 'user', orgField: 'organization_id', orgType: 'uuid',
    transform: (r) => {
      const d = { ...r };
      d.name = r.full_name;
      delete d.full_name;
      d.is_active = Boolean(r.is_active);
      d.is_superuser = Boolean(r.is_superuser);
      // Prisma User model uses @map for createdAt/updatedAt
      d.createdAt = d.created_at;
      delete d.created_at;
      d.updatedAt = d.updated_at;
      delete d.updated_at;
      d.last_login = null;
      d.avatar_url = null;
      return d;
    },
  },
  {
    table: 'pros', prisma: 'pros',
    transform: (r) => {
      const d = { ...r };
      delete d.organization_id;
      return d;
    },
  },
  {
    table: 'labels', prisma: 'labels',
    transform: (r) => {
      const d = { ...r };
      delete d.organization_id;
      return d;
    },
  },
  { table: 'publishers', prisma: 'publishers' },
  {
    table: 'artists', prisma: 'artists', orgField: 'organization_id', orgType: 'uuid',
    transform: (r) => ({ ...r, streaming_link: null }),
  },
  { table: 'releases', prisma: 'releases', orgField: 'organization_id', orgType: 'uuid' },
  {
    table: 'tracks', prisma: 'tracks',
    transform: (r) => {
      const d = { ...r };
      delete d.organization_id;
      if (d.duration && typeof d.duration === 'string') {
        d.duration = new Date('1970-01-01T' + d.duration);
      }
      return d;
    },
  },
  {
    table: 'contracts', prisma: 'contracts', orgField: 'organization_id', orgType: 'int',
    transform: (r) => {
      if (r.organization_id == null) {
        return { ...r, organization_id: 1 };
      }
      return r;
    },
  },
  { table: 'contract_parties', prisma: 'contract_parties', orgField: 'organization_id', orgType: 'int' },
  { table: 'contract_assets', prisma: 'contract_assets', orgField: 'organization_id', orgType: 'int' },
  { table: 'contract_documents', prisma: 'contract_documents', orgField: 'organization_id', orgType: 'int' },
  {
    table: 'contract_track_links', prisma: 'contract_track_links', orgField: 'organization_id', orgType: 'uuid',
    transform: (r) => {
      const d = { ...r };
      delete d.link_status;
      delete d.note;
      delete d.created_by_user_id;
      delete d.updated_at;
      return d;
    },
  },
  { table: 'individuals', prisma: 'individuals', orgField: 'organization_id', orgType: 'int' },
  { table: 'documents', prisma: 'documents', orgField: 'organization_id', orgType: 'uuid' },
  { table: 'tasks', prisma: 'tasks', orgField: 'organization_id', orgType: 'uuid' },
  { table: 'status_quo_items', prisma: 'status_quo_items', orgField: 'organization_id', orgType: 'uuid' },
  { table: 'activities', prisma: 'activities' },
  { table: 'audit_logs', prisma: 'audit_logs', orgField: 'organization_id', orgType: 'int' },
  { table: 'ai_sessions', prisma: 'ai_sessions', orgField: 'organization_id', orgType: 'uuid' },
  { table: 'ai_messages', prisma: 'ai_messages' },
  {
    table: 'ai_audit_log', prisma: 'ai_audit_log', orgField: 'organization_id', orgType: 'uuid',
    transform: (r) => {
      if (r.parser_version && r.parser_version.length > 20) {
        r.parser_version = r.parser_version.substring(0, 20);
      }
      return r;
    },
  },
  {
    table: 'ai_contract_resolution_runs', prisma: 'ai_contract_resolution_runs', orgField: 'organization_id', orgType: 'uuid',
    transform: (r) => {
      delete r.splits_total;
      delete r.warnings;
      delete r.contract_id;
      return r;
    },
  },
  {
    table: 'ai_contract_resolution_links', prisma: 'ai_contract_resolution_links',
    transform: (r) => {
      delete r.display_name;
      delete r.name;
      return r;
    },
  },
  { table: 'ai_core_write_proposal_runs', prisma: 'ai_core_write_proposal_runs', orgField: 'organization_id', orgType: 'int' },
  { table: 'ai_core_write_proposal_items', prisma: 'ai_core_write_proposal_items', orgField: 'organization_id', orgType: 'int' },
  { table: 'ai_core_write_apply_events', prisma: 'ai_core_write_apply_events', orgField: 'organization_id', orgType: 'int' },
  { table: 'admin_backup_artifacts', prisma: 'admin_backup_artifacts', orgField: 'organization_id', orgType: 'int' },
  { table: 'admin_backup_restore_events', prisma: 'admin_backup_restore_events' },
  { table: 'admin_restore_audit', prisma: 'admin_restore_audit', orgField: 'organization_id', orgType: 'int' },
  { table: 'report_runs', prisma: 'report_runs', orgField: 'organization_id', orgType: 'uuid' },
  { table: 'report_artifacts', prisma: 'report_artifacts', orgField: 'organization_id', orgType: 'uuid' },
  {
    table: 'track_releases', prisma: 'track_releases', compositeKey: ['track_id', 'release_id'],
  },
];

async function importTable(config) {
  const { table, prisma: modelName, orgField, orgType, transform, compositeKey } = config;
  log(`Importing ${table} → ${modelName}...`);
  stats.details[table] = { source: 0, imported: 0, skipped: 0, errors: 0 };

  try {
    const rows = source.prepare(`SELECT * FROM "${table}"`).all();
    stats.details[table].source = rows.length;
    if (rows.length === 0) { log(`  ${table}: 0 rows, skipping`); return; }

    if (!DRY_RUN && !compositeKey) {
      const existingCount = await prisma[modelName].count();
      if (existingCount >= rows.length) {
        stats.details[table].imported = rows.length;
        stats.imported += rows.length;
        success(`${table}: ${existingCount}/${rows.length} rows (already imported)`);
        return;
      }
    }

    for (const row of rows) {
      try {
        let data = cleanRow(row, config);
        if (transform) data = transform(data);
        if (!data) { stats.details[table].skipped++; continue; }

        if (!DRY_RUN) {
          const where = compositeKey
            ? { [compositeKey.join('_')]: Object.fromEntries(compositeKey.map(k => [k, data[k]])) }
            : { id: data.id };
          await (prisma[modelName]).upsert({
            where,
            create: data,
            update: data,
          });
        }
        stats.details[table].imported++;
        stats.imported++;
      } catch (err) {
        stats.details[table].errors++;
        stats.errors++;
        const detail = err.message?.substring(0, 800) || err;
        error(`${table} id=${row.id}: ${detail}`);
        if (err.code === 'P2002' || (err.message && err.message.includes('Unique constraint'))) {
          stats.details[table].skipped++;
        }
      }
    }
    success(`${table}: ${stats.details[table].imported}/${rows.length} rows`);
    if (stats.details[table].skipped > 0) warn(`  ${table}: ${stats.details[table].skipped} skipped`);
    if (stats.details[table].errors > 0) warn(`  ${table}: ${stats.details[table].errors} errors`);
  } catch (err) {
    error(`Failed to query ${table}: ${err.message}`);
  }
}

async function main() {
  log(`Source: ${SOURCE_DB}`);
  log(`Mode: ${DRY_RUN ? 'DRY RUN (no data written)' : 'PRODUCTION IMPORT'}`);

  const sourceCount = source.prepare('SELECT COUNT(*) as c FROM organizations').get();
  log(`Source connection OK (${JSON.stringify(sourceCount)})`);

  const start = Date.now();

  for (const config of TABLE_CONFIGS) {
    await importTable(config);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  log(`\n=== Migration Complete (${elapsed}s) ===`);
  log(`Total imported: ${stats.imported}`);
  log(`Total skipped: ${stats.skipped}`);
  log(`Total errors: ${stats.errors}`);

  console.log('\nTable Summary:');
  console.log('┌──────────────────────────────┬────────┬──────────┬─────────┬────────┐');
  console.log('│ Table                        │ Source │ Imported │ Skipped │ Errors │');
  console.log('├──────────────────────────────┼────────┼──────────┼─────────┼────────┤');
  for (const [table, s] of Object.entries(stats.details)) {
    console.log(`│ ${table.padEnd(28)} │ ${String(s.source).padStart(6)} │ ${String(s.imported).padStart(8)} │ ${String(s.skipped).padStart(7)} │ ${String(s.errors).padStart(6)} │`);
  }
  console.log('└──────────────────────────────┴────────┴──────────┴─────────┴────────┘');

  source.close();
  await prisma.$disconnect();

  if (stats.errors > 0 && !DRY_RUN) {
    console.log('\n⚠ Some errors occurred during import. Review the log above.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  source.close();
  prisma.$disconnect();
  process.exit(1);
});
