# Data Import Plan: Desktop SQLite → Neon PostgreSQL (Prisma)

## Overview

Migrate all data from the production desktop SQLite database (`~/.otto/data/db/otto.sqlite`) to the Neon PostgreSQL database managed by Prisma (`/Users/m2krproduction/otto-cloud/prisma/schema.prisma`). The source contains ~3,600+ rows across ~40 tables covering artists, releases, tracks, contracts, CRM, office records, AI records, and audit logs.

### Key Translation

- **organization_id**: Desktop uses `INTEGER` (values 1, 2, ...). Prisma uses `UUID String` for most models. All desktop records belong to org_id 1 → map to `"00000000-0000-0000-0000-000000000001"`.
- Some models (`contracts`, `audit_logs`, `individuals`) use `Int` for `organization_id` in Prisma and map directly.

---

## Source Database Inventory

| Table | Rows | Status |
|---|---|---|
| artists | 167 | Import |
| tracks | 396 | Import |
| releases | 83 | Import |
| track_releases | 3 | Import |
| works | 0 | Skip |
| contracts | 90 | Import |
| contract_parties | 166 | Import |
| contract_assets | 97 | Import |
| contract_documents | 67 | Import |
| contract_track_links | 96 | Import |
| contract_split_groups | 0 | Skip |
| contract_splits | 0 | Skip |
| labels | 1 | Import |
| pros | 1 | Import |
| publishers | 0 | Skip |
| organizations | 26 | Import |
| individuals | 16 | Import |
| individual_organizations | 0 | Skip |
| network_relationships | 0 | Skip |
| users | 6 | Import |
| documents | 83 | Import |
| tasks | 219 | Import |
| status_quo_items | 219 | Import |
| activities | 19 | Import |
| audit_logs | 1278 | Import |
| ai_audit_log | 368 | Import |
| ai_contract_resolution_runs | 91 | Import |
| ai_contract_resolution_links | 5 | Import |
| ai_core_write_proposal_runs | 2 | Import |
| ai_core_write_proposal_items | 8 | Import |
| ai_core_write_apply_events | 1 | Import |
| ai_sessions | 2 | Import |
| ai_messages | 6 | Import |
| report_artifacts | 36 | Import |
| report_runs | 13 | Import |
| admin_backup_artifacts | 4 | Import |
| admin_backup_restore_events | 52 | Import |
| admin_restore_audit | 42 | Import |
| distributors | 0 | Skip |
| ai_link_commits | 0 | Skip |
| ai_link_suggestions | 0 | Skip |
| ai_royalty_runs | 0 | Skip |
| contract_entity_links | 0 | Skip |
| contract_intake_entity_links | 0 | Skip |
| contract_referenced_originals | 0 | Skip |
| contract_release_links | 0 | Skip |
| jobs | 0 | Skip |
| plans | 0 | Skip |
| subscriptions | 0 | Skip |
| usage | 0 | Skip |

---

## Table Name Mappings

| Desktop Table | Prisma Model | Status |
|---|---|---|
| organizations | `organizations` | Direct |
| users | `User` | Direct |
| pros | `pros` | Direct |
| publishers | `publishers` | Empty, skip |
| labels | `labels` | Direct |
| artists | `artists` | Direct |
| works | `works` | Empty, skip |
| releases | `releases` | Direct |
| tracks | `tracks` | Direct |
| track_releases | `track_releases` | Direct (3 rows) |
| contracts | `contracts` | Direct |
| contract_parties | `contract_parties` | Direct |
| contract_assets | `contract_assets` | Direct |
| contract_documents | `contract_documents` | Direct |
| contract_track_links | `contract_track_links` | Direct |
| contract_split_groups | `contract_split_groups` | Empty, skip |
| contract_splits | `contract_splits` | Empty, skip |
| individuals | `individuals` | Direct |
| individual_organizations | `individual_organizations` | Empty, skip |
| network_relationships | `network_relationships` | Empty, skip |
| documents | `documents` | Direct |
| tasks | `tasks` | Direct |
| status_quo_items | `status_quo_items` | Direct |
| activities | `activities` | Direct |
| audit_logs | `audit_logs` | Direct |
| ai_sessions | `ai_sessions` | Direct |
| ai_messages | `ai_messages` | Direct |
| ai_audit_log | `ai_audit_log` | Direct |
| ai_contract_resolution_runs | `ai_contract_resolution_runs` | Direct |
| ai_contract_resolution_links | `ai_contract_resolution_links` | Direct |
| ai_core_write_proposal_runs | `ai_core_write_proposal_runs` | Direct |
| ai_core_write_proposal_items | `ai_core_write_proposal_items` | Direct |
| ai_core_write_apply_events | `ai_core_write_apply_events` | Direct |
| admin_backup_artifacts | `admin_backup_artifacts` | Direct |
| admin_backup_restore_events | `admin_backup_restore_events` | Direct |
| admin_restore_audit | `admin_restore_audit` | Direct |
| report_runs | `report_runs` | Direct |
| report_artifacts | `report_artifacts` | Direct |

---

## Field Mapping

### organization_id (common across most models)

| Desktop | Prisma | Mapping |
|---|---|---|
| `INTEGER` (1, 2, ...) | `UUID String` | `1 → "00000000-0000-0000-0000-000000000001"` |
| | | All other org IDs (2+) → check if they map to a UUID in the `organizations` table, else ignore |

### Users

| Desktop (`users`) | Prisma (`User`) | Notes |
|---|---|---|
| `id` | `id` | Direct |
| `full_name` | `full_name` | Direct |
| `email` | `email` | Direct |
| `hashed_password` | `hashed_password` | Direct |
| `is_active` | `is_active` | Direct |
| `is_superuser` | `is_superuser` | Direct |
| `role` | `role` | Direct |
| `organization_id` (INT) | `organization_id` (UUID) | Always 1 → map to default UUID |
| `created_at` / `updated_at` | `created_at` / `updated_at` | Direct |

### Labels / PROs / Publishers

| Desktop | Prisma | Notes |
|---|---|---|
| All columns | Same columns | Direct mapping |
| `organization_id` (INT) | `organization_id` (UUID) | Translate via org mapping |

### Artists

| Desktop (`artists`) | Prisma (`artists`) | Notes |
|---|---|---|
| `id` | `id` | Direct |
| `organization_id` (INT) | `organization_id` (UUID) | Translate via org mapping |
| `is_deleted` | `is_deleted` | Direct |
| `artist_id` | `artist_id` | Direct |
| `name` | `name` | Direct |
| `aka` | `aka` | Direct |
| `nationality` | `nationality` | Direct |
| `id_number` | `id_number` | Direct |
| `ipi_number` | `ipi_number` | Direct |
| `contact_email` | `contact_email` | Direct |
| `contact_phone` | `contact_phone` | Direct |
| `physical_address` | `physical_address` | Direct |
| `banking_details` (JSON) | `banking_details` (JSON) | Direct |
| `profile_image_url` | `profile_image_url` | Direct |
| `streaming_links` (JSON) | `streaming_links` (JSON) | Direct |
| `social_media` (JSON) | `social_media` (JSON) | Direct |
| `label_id` | `label_id` | Direct |
| `publisher_id` | `publisher_id` | Direct |
| `pro_id` | `pro_id` | Direct |
| `created_at` | `created_at` | Direct |
| `updated_at` | `updated_at` | Direct |
| `artist_kind` | `artist_kind` | Direct |
| `legal_name` | `legal_name` | Direct |
| _(none)_ | `streaming_link` (VARCHAR 500) | Set to `null` (added later in Prisma) |

### Releases

| Desktop (`releases`) | Prisma (`releases`) | Notes |
|---|---|---|
| `id` | `id` | Direct |
| `organization_id` (INT) | `organization_id` (UUID) | Translate via org mapping |
| `is_deleted` | `is_deleted` | Direct |
| `release_id` | `release_id` | Direct |
| `title` | `title` | Direct |
| `catalog_number` | `catalog_number` | Direct |
| `upc_code` | `upc_code` | Direct |
| `release_date` | `release_date` | Direct |
| `release_type` | `release_type` | Direct |
| `cover_art_url` | `cover_art_url` | Direct |
| `label_id` | `label_id` | Direct |
| `artist_id` | `artist_id` | Direct |
| `artist_ids` (JSON) | `artist_ids` (JSON) | Direct |
| `credits` (JSON) | `credits` (JSON) | Direct |
| `distributor_id` | `distributor_id` | Desktop `distributors` table has 0 rows. If `distributor_id` doesn't match an `organizations` row, set to `null`. |
| `created_at` | `created_at` | Direct |
| `updated_at` | `updated_at` | Direct |
| `streaming_link` | `streaming_link` | Direct |

### Tracks

| Desktop (`tracks`) | Prisma (`tracks`) | Notes |
|---|---|---|
| `id` | `id` | Direct |
| `track_id` | `track_id` | Direct |
| `title` | `title` | Direct |
| `duration` (TIME) | `duration` (TIME) | Direct |
| `genre` | `genre` | Direct |
| `release_date` | `release_date` | Direct |
| `isrc_code` | `isrc_code` | Direct |
| `streaming_link` | `streaming_link` | Direct |
| `artist_ids` (JSON) | `artist_ids` (JSON) | Direct |
| `credits` (JSON) | `credits` (JSON) | Direct |
| `file_location` | `file_location` | Direct |
| `release_id` | `release_id` | Direct |
| `work_id` | `work_id` | Direct (nullable) |
| `created_at` | `created_at` | Direct |
| `updated_at` | `updated_at` | Direct |
| `organization_id` (INT) | `organization_id` (UUID) | Translate via org mapping |

### Contracts

| Desktop (`contracts`) | Prisma (`contracts`) | Notes |
|---|---|---|
| All columns | Same columns | Direct mapping |
| `organization_id` (INT) | `organization_id` (INT) | Direct — Prisma uses `Int` for this model |
| `created_by` | `created_by` | Direct (nullable) |
| `advances_amount` (NUMERIC 10,2) | `advances_amount` (Decimal) | Direct |

### Contract Sub-tables

All contract sub-tables (`contract_parties`, `contract_assets`, `contract_documents`, `contract_track_links`, `contract_split_groups`, `contract_splits`) map directly column-for-column. FK columns reference the contract table.

### Network CRM

| Desktop | Prisma | Notes |
|---|---|---|
| `organizations` | `organizations` | Direct |
| `individuals` | `individuals` | Direct; `organization_id` is INT in both |
| `individual_organizations` | `individual_organizations` | Empty, skip |
| `network_relationships` | `network_relationships` | Empty, skip |

### Office

| Desktop | Prisma | Notes |
|---|---|---|
| `documents` | `documents` | Direct (`uploaded_by` FK to users) |
| `tasks` | `tasks` | Direct |
| `status_quo_items` | `status_quo_items` | Direct |
| `events` | `events` | Empty, skip |
| `notes` | `notes` | Empty, skip |

### AI Records

| Desktop | Prisma | org_id Type | Notes |
|---|---|---|---|
| `ai_audit_log` | `ai_audit_log` | INT → UUID | Translate via org mapping |
| `ai_contract_resolution_runs` | `ai_contract_resolution_runs` | UUID in both | Direct (values already UUID) |
| `ai_contract_resolution_links` | `ai_contract_resolution_links` | UUID in both | Direct |
| `ai_core_write_proposal_runs` | `ai_core_write_proposal_runs` | INT → UUID | Translate via org mapping |
| `ai_core_write_proposal_items` | `ai_core_write_proposal_items` | INT → UUID | Translate via org mapping |
| `ai_core_write_apply_events` | `ai_core_write_apply_events` | INT → UUID | Translate via org mapping |
| `ai_sessions` | `ai_sessions` | UUID in both | Direct |
| `ai_messages` | `ai_messages` | UUID in both | Direct |

### Activities & Audit Logs

| Desktop | Prisma | Notes |
|---|---|---|
| `activities` | `activities` | No `organization_id` field; direct mapping |
| `audit_logs` | `audit_logs` | `organization_id` is INT in both; direct mapping |

---

## Import Order

The import must respect foreign key dependencies. Listed tables are imported in sequence; empty tables are skipped.

1. **organizations** (26) — no FKs to other business entities
2. **users** (6) — FK to organizations (`organization_id`)
3. **pros** (1)
4. **labels** (1)
5. **artists** (167) — FK to labels, publishers, pros
6. **releases** (83) — FK to labels, artists, organizations (distributor)
7. **tracks** (396) — FK to releases, works (work_id nullable)
8. **track_releases** (3) — FK to tracks, releases
9. **contracts** (90) — created_by is nullable
10. **contract_parties** (166) — FK to contracts
11. **contract_assets** (97) — FK to contracts
12. **contract_documents** (67) — FK to contracts
13. **contract_track_links** (96) — FK to contracts, tracks
14. **individuals** (16) — FK to organizations
15. **documents** (83) — FK to users (uploaded_by)
16. **tasks** (219) — FK to users (assigned_to)
17. **status_quo_items** (219) — FK to users (resolved_by_user_id)
18. **activities** (19) — FK to users
19. **audit_logs** (1278) — FK to users
20. **ai_sessions** (2) — FK to users
21. **ai_messages** (6) — FK to ai_sessions
22. **ai_audit_log** (368) — FK to users
23. **ai_contract_resolution_runs** (91) — FK to users
24. **ai_contract_resolution_links** (5) — FK to runs
25. **ai_core_write_proposal_runs** (2) — FK to users
26. **ai_core_write_proposal_items** (8) — FK to runs
27. **ai_core_write_apply_events** (1) — FK to runs, users
28. **admin_backup_artifacts** (4) — FK to users
29. **admin_backup_restore_events** (52) — FK to users
30. **admin_restore_audit** (42) — FK to users
31. **report_runs** (13) — FK to users
32. **report_artifacts** (36) — FK to report_runs

---

## Column Mapping Issues

### 1. organization_id: INTEGER → UUID String

Most Prisma models define `organization_id` as a `UUID String`. The desktop uses `INTEGER` (always 1 for current data).

**Rule**: Translate desktop integer `1` → `"00000000-0000-0000-0000-000000000001"` for all models where Prisma expects UUID.

**Exception models** (Prisma uses `Int` for organization_id, map directly):
- `contracts`
- `audit_logs`
- `individuals`

### 2. artists.streaming_link (VARCHAR 500)

Desktop does not have this column. Prisma added it later as a nullable field.

**Rule**: Set to `null` for all imported artist rows.

### 3. releases.distributor_id (UUID → UUID)

Desktop references a `distributors` table that has 0 rows. Prisma FK references `organizations`.

**Rule**: If a release has a `distributor_id` set, look up whether it corresponds to a valid `organizations` row. If not found, set to `null`.

### 4. releases.streaming_link

Present in both source and target.

**Rule**: Direct mapping.

### 5. contracts.contract_number

Present in both source and target (unique together with `organization_id`).

**Rule**: Direct mapping.

### 6. track_releases junction table

Desktop has a `track_releases` table with 3 rows connecting tracks to releases.

**Rule**: Direct mapping; import after tracks and releases are complete.

### 7. timestamps

Ensure `created_at` and `updated_at` are converted to ISO 8601 strings compatible with PostgreSQL `DateTime`.

### 8. JSON columns

Desktop stores JSON in text columns. Prisma uses `Json` type.

**Rule**: Parse the text as JSON and pass as native JSON objects. This applies to `artist_ids`, `credits`, `banking_details`, `streaming_links`, `social_media`, etc.

### 9. NULL vs DEFAULT

Some Prisma models have default values for fields that desktop may store as `NULL`.

**Rule**: Preserve `NULL` values from source where Prisma allows nullability. Where Prisma has a `@default` and the source value is `NULL`, let Prisma apply the default.

---

## Rollback Strategy

### Pre-Import Snapshot

Before any data is written, capture a snapshot of the target database:

```sql
-- Generate per-table row counts
SELECT schemaname, tablename, n_live_tup
FROM pg_stat_user_tables
ORDER BY tablename;
```

### Checkpointing

Import one table at a time in dependency order. After each successful table import, record a checkpoint with:

- Table name
- Row count inserted
- Timestamp
- Last imported ID (if applicable)

### Failure Recovery

If a table import fails:

1. **Stop** the import process immediately.
2. **Identify** the table that failed and all tables that depend on it (directly or transitively).
3. **Roll back** by running `deleteMany` on the failed table and all dependent tables (in reverse dependency order).
4. **Restore** from the last successful checkpoint by re-running the import for the failed table.

Example rollback for a failure during `tracks` import:

```typescript
// Reverse dependency order
await prisma.track_releases.deleteMany({ where: { organization_id: "00000000-..." } });
await prisma.tracks.deleteMany({ where: { organization_id: "00000000-..." } });
await prisma.releases.deleteMany({ where: { organization_id: "00000000-..." } });
// etc.
```

### Redundancy

- The desktop SQLite database at `~/.otto/data/db/otto.sqlite` is **never modified** during this process. It serves as the authoritative rollback source.
- All import scripts should be idempotent — running them multiple times should produce the same result (use `upsert` or delete-then-insert patterns where possible).

### Post-Import Verification

After the full import:

1. Compare row counts table-by-table against the source inventory.
2. Spot-check foreign key integrity: every FK value should reference an existing row.
3. Verify `organization_id` translation: no UUID `organization_id` should be `null` or contain an integer value.
4. Run application smoke tests (login, list artists, view contracts, etc.).
