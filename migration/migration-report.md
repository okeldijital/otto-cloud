# Legacy Data Migration Report

**Generated:** 2026-07-18T13:25:26.585Z

## Configuration

| Key | Value |
|-----|-------|
| Source SQLite | `/Users/m2krproduction/.otto/data/db/otto.sqlite.corrupt_backup_1771348830` |
| Target | `postgresql://neondb_owner:****@ep-little-breeze-apih3wtz-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| Dry run | false |
| Resume | false |

## Totals

| Metric | Count |
|--------|------:|
| Source rows (sum) | 1389 |
| Imported | 1326 |
| Skipped | 51 |
| Errors | 12 |
| Completed tables | 39 |

## Per-table

| Table | Status | Source | Imported | Skipped | Errors | Duration |
|-------|--------|-------:|---------:|--------:|-------:|---------:|
| organizations | completed | 28 | 28 | 0 | 0 | 11s |
| users | completed | 6 | 6 | 0 | 0 | 2s |
| roles | skipped | 0 | 0 | 0 | 0 | — |
| permissions | skipped | 0 | 0 | 0 | 0 | — |
| role_permissions | skipped | 0 | 0 | 0 | 0 | — |
| user_roles | skipped | 0 | 0 | 0 | 0 | — |
| teams | skipped | 0 | 0 | 0 | 0 | — |
| team_members | skipped | 0 | 0 | 0 | 0 | — |
| individuals | completed | 18 | 18 | 0 | 0 | 15s |
| individual_organizations | completed | 0 | 0 | 0 | 0 | 1ms |
| labels | completed | 14 | 14 | 0 | 0 | 5s |
| pros | completed | 13 | 13 | 0 | 0 | 4s |
| publishers | completed | 13 | 13 | 0 | 0 | 4s |
| platforms | completed | 0 | 0 | 0 | 0 | 1ms |
| artists | completed | 176 | 141 | 35 | 0 | 2m 3s |
| artist_memberships | skipped | 0 | 0 | 0 | 0 | — |
| works | completed | 25 | 25 | 0 | 0 | 9s |
| releases | completed | 111 | 99 | 0 | 12 | 1m 5s |
| tracks | completed | 389 | 389 | 0 | 0 | 2m 16s |
| track_releases | completed | 3 | 3 | 0 | 0 | 1s |
| contracts | completed | 15 | 15 | 0 | 0 | 8s |
| contract_parties | completed | 9 | 9 | 0 | 0 | 6s |
| contract_assets | completed | 0 | 0 | 0 | 0 | 0ms |
| contract_documents | completed | 0 | 0 | 0 | 0 | 0ms |
| contract_track_links | skipped | 0 | 0 | 0 | 0 | — |
| contract_split_groups | completed | 0 | 0 | 0 | 0 | 0ms |
| contract_splits | completed | 0 | 0 | 0 | 0 | 1ms |
| contract_songwriter_release_links | skipped | 0 | 0 | 0 | 0 | — |
| documents | completed | 0 | 0 | 0 | 0 | 0ms |
| tasks | completed | 0 | 0 | 0 | 0 | 1ms |
| status_quo_items | completed | 0 | 0 | 0 | 0 | 0ms |
| activities | completed | 4 | 4 | 0 | 0 | 2s |
| audit_logs | completed | 565 | 549 | 16 | 0 | 3m 4s |
| events | completed | 0 | 0 | 0 | 0 | 2ms |
| notes | completed | 0 | 0 | 0 | 0 | 1ms |
| office_documents | completed | 0 | 0 | 0 | 0 | 1ms |
| office_document_links | completed | 0 | 0 | 0 | 0 | 1ms |
| office_notes | completed | 0 | 0 | 0 | 0 | 0ms |
| office_note_links | completed | 0 | 0 | 0 | 0 | 0ms |
| playlists | completed | 0 | 0 | 0 | 0 | 1ms |
| network_relationships | completed | 0 | 0 | 0 | 0 | 0ms |
| works_admin | completed | 0 | 0 | 0 | 0 | 0ms |
| works_admin_documents | completed | 0 | 0 | 0 | 0 | 0ms |
| report_definitions | completed | 0 | 0 | 0 | 0 | 0ms |
| report_runs | completed | 0 | 0 | 0 | 0 | 1ms |
| report_artifacts | completed | 0 | 0 | 0 | 0 | 1ms |
| royalties | completed | 0 | 0 | 0 | 0 | 0ms |
| contract_entity_links | skipped | 0 | 0 | 0 | 0 | — |
| contract_intake_entity_links | skipped | 0 | 0 | 0 | 0 | — |
| contract_intake_release_links | completed | 0 | 0 | 0 | 0 | 1ms |
| contract_release_links | skipped | 0 | 0 | 0 | 0 | — |

## Warnings

- **releases**: 12 errors

## ID map entities

- artists: 176 ids
- organizations: 34 ids
- users: 6 ids
- individuals: 18 ids
- labels: 14 ids
- pros: 13 ids
- publishers: 13 ids
- works: 25 ids
- releases: 99 ids
- tracks: 389 ids
- contracts: 15 ids

## Artifacts

- `migration/table-map.json`
- `migration/id-map.json`
- `migration/migration-state.json`
- `migration/validation-report.md`
- `migration/data-quality-report.md`
- `migration/sqlite-schema.md`
- `migration/schema-comparison.md`
