# Schema Comparison — SQLite ↔ PostgreSQL

**Generated:** 2026-07-18T12:49:01.388Z

## Exact / Direct matches

- `activities` → `activities`
- `audit_logs` → `audit_logs`
- `documents` → `documents`
- `events` → `events`
- `individual_organizations` → `individual_organizations`
- `individuals` → `individuals`
- `network_relationships` → `network_relationships`
- `notes` → `notes`
- `office_document_links` → `office_document_links`
- `office_documents` → `office_documents`
- `office_note_links` → `office_note_links`
- `office_notes` → `office_notes`
- `organizations` → `organizations`
- `playlists` → `playlists`
- `report_artifacts` → `report_artifacts`
- `report_definitions` → `report_definitions`
- `report_runs` → `report_runs`
- `royalties` → `royalties`
- `status_quo_items` → `status_quo_items`
- `tasks` → `tasks`
- `works_admin` → `works_admin`
- `works_admin_documents` → `works_admin_documents`
- `roles` → `roles`
- `permissions` → `permissions`
- `role_permissions` → `role_permissions`
- `user_roles` → `user_roles`
- `teams` → `teams`
- `team_members` → `team_members`
- `artist_memberships` → `artist_memberships`
- `contract_track_links` → `contract_track_links`
- `contract_songwriter_release_links` → `contract_songwriter_release_links`

## Transform

- `artists` → `artists`
- `contract_assets` → `contract_assets`
- `contract_documents` → `contract_documents`
- `contract_entity_links` → `contract_entity_links`
- `contract_intake_entity_links` → `contract_intake_entity_links`
- `contract_intake_release_links` → `contract_intake_release_links`
- `contract_parties` → `contract_parties`
- `contract_release_links` → `contract_release_links`
- `contract_split_groups` → `contract_split_groups`
- `contract_splits` → `contract_splits`
- `contracts` → `contracts`
- `labels` → `labels`
- `platforms` → `platforms`
- `pros` → `pros`
- `publishers` → `publishers`
- `releases` → `releases`
- `track_releases` → `track_releases`
- `tracks` → `tracks`
- `users` → `users`
- `works` → `works`
- `attachments` → `attachments` — Do not re-upload files. Link entityType/entityId via id-map.

## Deprecated / Ignored

- `admin_backup_artifacts` (ignored): Cloud workspace engine is source of truth
- `admin_backup_restore_events` (ignored): Cloud workspace engine is source of truth
- `admin_restore_audit` (ignored): Cloud workspace engine is source of truth
- `ai_audit_log` (ignored): AI run history optional; enable per customer if needed
- `ai_contract_documents` (ignored): AI run history optional; enable per customer if needed
- `ai_contract_resolution_links` (ignored): AI run history optional; enable per customer if needed
- `ai_contract_resolution_runs` (ignored): AI run history optional; enable per customer if needed
- `ai_contract_work_links` (ignored): AI run history optional; enable per customer if needed
- `ai_core_write_apply_events` (ignored): AI run history optional; enable per customer if needed
- `ai_core_write_proposal_items` (ignored): AI run history optional; enable per customer if needed
- `ai_core_write_proposal_runs` (ignored): AI run history optional; enable per customer if needed
- `ai_link_commits` (ignored): AI run history optional; enable per customer if needed
- `ai_link_suggestions` (ignored): AI run history optional; enable per customer if needed
- `ai_messages` (ignored): AI run history optional; enable per customer if needed
- `ai_release_integration_links` (ignored): AI run history optional; enable per customer if needed
- `ai_release_integration_runs` (ignored): AI run history optional; enable per customer if needed
- `ai_royalty_runs` (ignored): AI run history optional; enable per customer if needed
- `ai_royalty_simulation_runs` (ignored): AI run history optional; enable per customer if needed
- `ai_sessions` (ignored): AI run history optional; enable per customer if needed
- `alembic_version` (ignored): Marked non-migratable or replaced by cloud IAM/workspace engine
- `distributors` (deprecated): Marked non-migratable or replaced by cloud IAM/workspace engine

## Cloud-only (no SQLite source)

- `attachments` (from asset migration)
- `tenants`, `tenant_users`, `invitations`, `plans`, `subscriptions` (cloud IAM)
- Modern workspace engine tables beyond legacy workspace_* copies

## Row count snapshot

| Table | SQLite | Postgres |
|-------|-------:|---------:|
| organizations | 28 | 1 |
| users | 6 | 6 |
| roles | 0 | 12 |
| permissions | 0 | 71 |
| role_permissions | 0 | 313 |
| user_roles | 0 | 1 |
| teams | 0 | 0 |
| team_members | 0 | 0 |
| individuals | 18 | 0 |
| individual_organizations | 0 | 0 |
| labels | 14 | 14 |
| pros | 13 | 13 |
| publishers | 13 | 5 |
| platforms | 0 | 0 |
| artists | 163 | 0 |
| artist_memberships | 0 | 0 |
| works | 25 | 0 |
| releases | 104 | 0 |
| tracks | 389 | 0 |
| track_releases | 3 | 0 |
| contracts | 24 | 0 |
| contract_parties | 9 | 0 |
| contract_assets | 0 | 0 |
| contract_documents | 0 | 0 |
| contract_track_links | 0 | 0 |
| contract_split_groups | 0 | 0 |
| contract_splits | 0 | 0 |
| contract_songwriter_release_links | 0 | — |
| documents | 0 | 0 |
| tasks | 0 | 0 |
| status_quo_items | 0 | 0 |
| activities | 4 | 0 |
| audit_logs | 565 | 0 |
| events | 0 | 0 |
| notes | 0 | 0 |
| office_documents | 0 | 0 |
| office_document_links | 0 | 0 |
| office_notes | 0 | 0 |
| office_note_links | 0 | 0 |
| playlists | 0 | 0 |
| network_relationships | 0 | 0 |
| works_admin | 0 | 0 |
| works_admin_documents | 0 | 0 |
| report_definitions | 0 | 0 |
| report_runs | 0 | 0 |
| report_artifacts | 0 | 0 |
| royalties | 0 | 0 |
| alembic_version | 1 | 0 |
