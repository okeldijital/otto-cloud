# Legacy Desktop → Cloud Data Migration Framework

**Milestone:** Legacy Data Migration  
**Priority:** Critical  

Reusable platform capability for importing Otto desktop (SQLite) business data into Otto Cloud (PostgreSQL / Neon).

## Commands

```bash
npm run migrate:data:preflight
npm run migrate:data:inventory
npm run migrate:data:profile
npm run migrate:data:dry-run
npm run migrate:data
npm run migrate:data:verify
npm run migrate:data:report
npm run migrate:data:link-attachments
```

Options (any command):

```bash
npx tsx scripts/migrate-data/index.ts migrate --table artists --limit 50 --resume --verbose
npx tsx scripts/migrate-data/index.ts dry-run --local-db /path/to/customer.sqlite
```

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon / Postgres |
| `OTTO_SQLITE_PATH` | Force source SQLite (otherwise auto-picks richest local backup) |
| `CLOUD_ORG_UUID` | UUID for string-scoped `organization_id` columns |

## Artifacts (`migration/`)

| File | Description |
|------|-------------|
| `sqlite-schema.md` | Full SQLite discovery |
| `postgres-schema.md` | Prisma models |
| `schema-comparison.md` | Mapping strategies |
| `table-map.json` | Every table → strategy |
| `data-quality-report.md` | Nulls, orphans, dups |
| `id-map.json` | Source ID → cloud ID |
| `migration-state.json` | Resume checkpoint |
| `validation-report.md` | SQLite vs PG counts |
| `migration-report.md` | Human summary |

## Guarantees

- Does **not** delete SQLite or PostgreSQL data
- Does **not** re-upload binary assets (use asset migration + `link-attachments`)
- Does **not** change Prisma schema or app logic
- Idempotent upserts preserve integer IDs when possible
- Resumable via `--resume` + `migration-state.json`

## Customer migration playbook

1. Place customer SQLite at a known path (or set `OTTO_SQLITE_PATH`)
2. Ensure cloud org/admin already bootstrapped (`npm run setup:cloud`)
3. Run asset migration first if files are needed
4. `inventory` → `profile` → `dry-run` → `migrate` → `verify` → `link-attachments` → `report`
5. Confirm dashboard catalog counts
