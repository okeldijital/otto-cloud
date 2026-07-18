# Validation Report

**Generated:** 2026-07-18T13:24:41.565Z
**Source:** `/Users/m2krproduction/.otto/data/db/otto.sqlite.corrupt_backup_1771348830`
**Mode:** live

| Table | Strategy | SQLite | Postgres | Delta | Status |
|-------|----------|-------:|---------:|------:|--------|
| activities | direct | 4 | 4 | 0 | pass |
| admin_backup_artifacts | ignored | — | — | — | skipped |
| admin_backup_restore_events | ignored | — | — | — | skipped |
| admin_restore_audit | ignored | — | — | — | skipped |
| ai_audit_log | ignored | — | — | — | skipped |
| ai_contract_documents | ignored | — | — | — | skipped |
| ai_contract_resolution_links | ignored | — | — | — | skipped |
| ai_contract_resolution_runs | ignored | — | — | — | skipped |
| ai_contract_work_links | ignored | — | — | — | skipped |
| ai_core_write_apply_events | ignored | — | — | — | skipped |
| ai_core_write_proposal_items | ignored | — | — | — | skipped |
| ai_core_write_proposal_runs | ignored | — | — | — | skipped |
| ai_link_commits | ignored | — | — | — | skipped |
| ai_link_suggestions | ignored | — | — | — | skipped |
| ai_messages | ignored | — | — | — | skipped |
| ai_release_integration_links | ignored | — | — | — | skipped |
| ai_release_integration_runs | ignored | — | — | — | skipped |
| ai_royalty_runs | ignored | — | — | — | skipped |
| ai_royalty_simulation_runs | ignored | — | — | — | skipped |
| ai_sessions | ignored | — | — | — | skipped |
| alembic_version | ignored | — | — | — | skipped |
| artists | transform | 176 | 141 | -35 | pass* |
| audit_logs | direct | 565 | 549 | -16 | warn |
| contract_assets | transform | 0 | 0 | 0 | pass |
| contract_documents | transform | 0 | 0 | 0 | pass |
| contract_entity_links | transform | 0 | -1 | — | n/a |
| contract_intake_entity_links | transform | 0 | -1 | — | n/a |
| contract_intake_release_links | transform | 0 | 0 | 0 | pass |
| contract_parties | transform | 9 | 9 | 0 | pass |
| contract_release_links | transform | 0 | -1 | — | n/a |
| contract_split_groups | transform | 0 | 0 | 0 | pass |
| contract_splits | transform | 0 | 0 | 0 | pass |
| contracts | transform | 15 | 15 | 0 | pass |
| distributors | deprecated | — | — | — | skipped |
| documents | direct | 0 | 0 | 0 | pass |
| events | direct | 0 | 0 | 0 | pass |
| individual_organizations | direct | 0 | 0 | 0 | pass |
| individuals | direct | 18 | 18 | 0 | pass |
| labels | transform | 14 | 14 | 0 | pass |
| network_relationships | direct | 0 | 0 | 0 | pass |
| notes | direct | 0 | 0 | 0 | pass |
| office_document_links | direct | 0 | 0 | 0 | pass |
| office_documents | direct | 0 | 0 | 0 | pass |
| office_note_links | direct | 0 | 0 | 0 | pass |
| office_notes | direct | 0 | 0 | 0 | pass |
| organizations | direct | 28 | 28 | 0 | pass |
| platforms | transform | 0 | 0 | 0 | pass |
| playlists | direct | 0 | 0 | 0 | pass |
| pros | transform | 13 | 13 | 0 | pass |
| publishers | transform | 13 | 13 | 0 | pass |
| releases | transform | 111 | 111 | 0 | pass |
| report_artifacts | direct | 0 | 0 | 0 | pass |
| report_definitions | direct | 0 | 0 | 0 | pass |
| report_runs | direct | 0 | 0 | 0 | pass |
| royalties | direct | 0 | 0 | 0 | pass |
| status_quo_items | direct | 0 | 0 | 0 | pass |
| tasks | direct | 0 | 0 | 0 | pass |
| track_releases | transform | 3 | 3 | 0 | pass |
| tracks | transform | 389 | 389 | 0 | pass |
| users | transform | 6 | 6 | 0 | pass |
| works | transform | 25 | 25 | 0 | pass |
| works_admin | direct | 0 | 0 | 0 | pass |
| works_admin_documents | direct | 0 | 0 | 0 | pass |
| roles | direct | -1 | 12 | — | n/a |
| permissions | direct | -1 | 71 | — | n/a |
| role_permissions | direct | -1 | 313 | — | n/a |
| user_roles | direct | -1 | 1 | — | n/a |
| teams | direct | -1 | 0 | — | n/a |
| team_members | direct | -1 | 0 | — | n/a |
| artist_memberships | direct | -1 | 0 | — | n/a |
| contract_track_links | direct | -1 | 0 | — | n/a |
| contract_songwriter_release_links | direct | -1 | -1 | — | n/a |

## Relationship spot-checks

- Tracks with missing release: **0** ✓
- Releases with missing artist: **0** ✓

## Overall: **PASS**

\* pass* = Postgres has more rows than SQLite (seed or prior imports).
Validation allows cloud ≥ source for non-destructive migrations.
