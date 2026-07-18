# SQLite Schema Discovery

**Source:** `/Users/m2krproduction/.otto/data/db/otto.sqlite.corrupt_backup_1771348830`
**Generated:** 2026-07-18T12:48:30.415Z

## Summary

| Metric | Count |
|--------|------:|
| Tables | 63 |
| Views | 0 |
| Indexes | 255 |
| Triggers | 0 |
| Foreign keys | 73 |
| Total rows | 2007 |

## Tables & Row Counts

| Table | Rows |
|-------|-----:|
| activities | 4 |
| admin_backup_artifacts | 3 |
| admin_backup_restore_events | 10 |
| admin_restore_audit | 42 |
| ai_audit_log | 405 |
| ai_contract_documents | 0 |
| ai_contract_resolution_links | 5 |
| ai_contract_resolution_runs | 90 |
| ai_contract_work_links | 0 |
| ai_core_write_apply_events | 18 |
| ai_core_write_proposal_items | 36 |
| ai_core_write_proposal_runs | 16 |
| ai_link_commits | 0 |
| ai_link_suggestions | 0 |
| ai_messages | 2 |
| ai_release_integration_links | 0 |
| ai_release_integration_runs | 0 |
| ai_royalty_runs | 0 |
| ai_royalty_simulation_runs | 0 |
| ai_sessions | 1 |
| alembic_version | 1 |
| artists | 163 |
| audit_logs | 565 |
| contract_assets | 0 |
| contract_documents | 0 |
| contract_entity_links | 0 |
| contract_intake_entity_links | 0 |
| contract_intake_release_links | 0 |
| contract_parties | 9 |
| contract_release_links | 0 |
| contract_split_groups | 0 |
| contract_splits | 0 |
| contracts | 24 |
| distributors | 0 |
| documents | 0 |
| events | 0 |
| individual_organizations | 0 |
| individuals | 18 |
| labels | 14 |
| network_relationships | 0 |
| notes | 0 |
| office_document_links | 0 |
| office_documents | 0 |
| office_note_links | 0 |
| office_notes | 0 |
| organizations | 28 |
| platforms | 0 |
| playlists | 0 |
| pros | 13 |
| publishers | 13 |
| releases | 104 |
| report_artifacts | 0 |
| report_definitions | 0 |
| report_runs | 0 |
| royalties | 0 |
| status_quo_items | 0 |
| tasks | 0 |
| track_releases | 3 |
| tracks | 389 |
| users | 6 |
| works | 25 |
| works_admin | 0 |
| works_admin_documents | 0 |

## Columns

### activities

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| user_id | INTEGER |  | Y |
| action | VARCHAR |  | Y |
| entity_type | VARCHAR |  | Y |
| entity_id | INTEGER |  | Y |
| entity_name | VARCHAR |  |  |
| timestamp | DATETIME |  | Y |

### admin_backup_artifacts

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  | Y |
| created_by | INTEGER |  | Y |
| backup_kind | VARCHAR(32) |  | Y |
| filename | VARCHAR(255) |  | Y |
| file_path | VARCHAR(1000) |  | Y |
| size_bytes | INTEGER |  | Y |
| sha256 | VARCHAR(64) |  | Y |
| is_pre_restore_snapshot | BOOLEAN |  | Y |
| source_backup_id | INTEGER |  |  |
| created_at | DATETIME |  |  |

### admin_backup_restore_events

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| backup_id | INTEGER |  | Y |
| snapshot_backup_id | INTEGER |  |  |
| initiator_user_id | INTEGER |  | Y |
| initiator_org_id | INTEGER |  | Y |
| status | VARCHAR(16) |  | Y |
| error | TEXT |  |  |
| duration_ms | INTEGER |  |  |
| created_at | DATETIME |  |  |

### admin_restore_audit

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  | Y |
| user_id | INTEGER |  | Y |
| backup_id | INTEGER |  | Y |
| pre_restore_snapshot_id | INTEGER |  |  |
| request_hash | VARCHAR(64) |  | Y |
| result | VARCHAR(16) |  | Y |
| error_hash | VARCHAR(64) |  |  |
| created_at | DATETIME |  |  |

### ai_audit_log

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| user_id | INTEGER |  | Y |
| action | VARCHAR(50) |  | Y |
| tool | VARCHAR(50) |  |  |
| request_hash | VARCHAR(64) |  | Y |
| created_at | DATETIME |  |  |
| parser_version | VARCHAR(20) |  |  |

### ai_contract_documents

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  | Y |
| release_id | INTEGER |  | Y |
| file_path | VARCHAR(1000) |  | Y |
| file_hash | VARCHAR(64) |  | Y |
| uploaded_by | INTEGER |  | Y |
| created_at | DATETIME |  |  |

### ai_contract_resolution_links

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| run_id | INTEGER |  | Y |
| entity_type | VARCHAR(50) |  | Y |
| entity_id | INTEGER |  |  |
| action | VARCHAR(20) |  | Y |
| confidence | INTEGER |  |  |
| rationale | TEXT |  |  |
| created_at | DATETIME |  |  |
| display_name | VARCHAR(255) |  |  |
| name | VARCHAR(255) |  |  |

### ai_contract_resolution_runs

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| user_id | INTEGER |  | Y |
| contract_hash | VARCHAR(64) |  | Y |
| extractor_version | VARCHAR(50) |  |  |
| linker_version | VARCHAR(50) |  |  |
| created_at | DATETIME |  |  |
| splits_total | INTEGER |  |  |
| warnings | TEXT |  |  |
| contract_id | INTEGER |  |  |

### ai_contract_work_links

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  | Y |
| contract_document_id | INTEGER |  | Y |
| work_id | INTEGER |  | Y |
| confidence | FLOAT |  | Y |
| match_strategy | VARCHAR(20) |  | Y |
| created_at | DATETIME |  |  |

### ai_core_write_apply_events

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  | Y |
| user_id | INTEGER |  | Y |
| run_id | INTEGER |  | Y |
| request_hash | VARCHAR(64) |  | Y |
| status | VARCHAR(16) |  | Y |
| applied_count | INTEGER |  | Y |
| created_count | INTEGER |  | Y |
| conflict_count | INTEGER |  | Y |
| details_json | TEXT |  |  |
| created_at | DATETIME |  |  |

### ai_core_write_proposal_items

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  | Y |
| run_id | INTEGER |  | Y |
| entity_type | VARCHAR(64) |  | Y |
| entity_id | INTEGER |  |  |
| operation | VARCHAR(16) |  | Y |
| patch_json | TEXT |  | Y |
| conflicts_json | TEXT |  |  |
| safe_defaults_json | TEXT |  |  |
| requires_user_review | BOOLEAN |  | Y |
| created_at | DATETIME |  |  |

### ai_core_write_proposal_runs

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  | Y |
| user_id | INTEGER |  | Y |
| contract_id | INTEGER |  | Y |
| release_id | INTEGER |  |  |
| contract_document_id | INTEGER |  |  |
| request_hash | VARCHAR(64) |  | Y |
| parser_version | VARCHAR(64) |  |  |
| linker_version | VARCHAR(64) |  |  |
| planner_version | VARCHAR(64) |  |  |
| created_at | DATETIME |  |  |

### ai_link_commits

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| transaction_id | VARCHAR(50) |  | Y |
| user_id | INTEGER |  | Y |
| commit_count | INTEGER |  | Y |
| created_at | DATETIME |  |  |

### ai_link_suggestions

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| source_entity_id | VARCHAR(50) |  | Y |
| target_entity_id | VARCHAR(50) |  | Y |
| confidence | FLOAT |  | Y |
| reason | VARCHAR(255) |  | Y |
| created_at | DATETIME |  |  |

### ai_messages

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| session_id | INTEGER |  | Y |
| role | VARCHAR(20) |  | Y |
| content | TEXT |  | Y |
| created_at | DATETIME |  |  |

### ai_release_integration_links

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  | Y |
| run_id | INTEGER |  | Y |
| entity_type | VARCHAR(32) |  | Y |
| entity_id | INTEGER |  |  |
| display_name | VARCHAR(255) |  | Y |
| action | VARCHAR(32) |  | Y |
| confidence | FLOAT |  |  |
| match_strategy | VARCHAR(20) |  | Y |
| rationale | TEXT |  |  |
| created_at | DATETIME |  |  |

### ai_release_integration_runs

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  | Y |
| user_id | INTEGER |  | Y |
| release_id | INTEGER |  | Y |
| contract_id | INTEGER |  |  |
| request_hash | VARCHAR(64) |  | Y |
| planner_version | VARCHAR(50) |  | Y |
| created_at | DATETIME |  |  |

### ai_royalty_runs

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| contract_id | VARCHAR(50) |  | Y |
| run_status | VARCHAR(20) |  | Y |
| created_at | DATETIME |  |  |

### ai_royalty_simulation_runs

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  | Y |
| user_id | INTEGER |  | Y |
| release_id | INTEGER |  | Y |
| contract_document_id | INTEGER |  |  |
| request_hash | VARCHAR(64) |  | Y |
| royalty_version | VARCHAR(50) |  | Y |
| splits_total | FLOAT |  | Y |
| integrity_total_equals_100 | BOOLEAN |  | Y |
| integrity_over_allocated | BOOLEAN |  | Y |
| integrity_under_allocated | BOOLEAN |  | Y |
| created_at | DATETIME |  |  |

### ai_sessions

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| user_id | INTEGER |  | Y |
| created_at | DATETIME |  |  |

### alembic_version

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| version_num | VARCHAR(32) | Y | Y |

### artists

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  |  |
| is_deleted | BOOLEAN |  | Y |
| artist_id | VARCHAR(50) |  |  |
| name | VARCHAR(255) |  | Y |
| aka | VARCHAR(255) |  |  |
| nationality | VARCHAR(100) |  |  |
| id_number | VARCHAR(100) |  |  |
| ipi_number | VARCHAR(50) |  |  |
| contact_email | VARCHAR(255) |  |  |
| contact_phone | VARCHAR(50) |  |  |
| physical_address | TEXT |  |  |
| banking_details | JSON |  |  |
| profile_image_url | VARCHAR(500) |  |  |
| streaming_links | JSON |  |  |
| social_media | JSON |  |  |
| label_id | INTEGER |  |  |
| publisher_id | INTEGER |  |  |
| pro_id | INTEGER |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### audit_logs

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y |  |
| action | VARCHAR(50) |  |  |
| entity_type | VARCHAR(50) |  |  |
| entity_id | INTEGER |  |  |
| entity_uuid | INTEGER |  |  |
| entity_name | VARCHAR(255) |  |  |
| organization_id | INTEGER |  |  |
| changes | JSON |  |  |
| user_id | INTEGER |  |  |
| ip_address | VARCHAR(45) |  |  |
| user_agent | VARCHAR(500) |  |  |
| created_at | DATETIME |  |  |

### contract_assets

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| contract_id | INTEGER |  | Y |
| organization_id | INTEGER |  | Y |
| asset_type | VARCHAR(50) |  | Y |
| asset_id | INTEGER |  | Y |
| scope_type | VARCHAR(50) |  |  |
| notes | TEXT |  |  |

### contract_documents

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| contract_id | INTEGER |  | Y |
| organization_id | INTEGER |  | Y |
| file_path | VARCHAR(500) |  | Y |
| file_name | VARCHAR(255) |  | Y |
| version | INTEGER |  | Y |
| uploaded_by | INTEGER |  |  |
| uploaded_at | DATETIME |  |  |
| checksum | VARCHAR(64) |  |  |
| mime_type | VARCHAR(100) |  |  |
| size_bytes | INTEGER |  |  |

### contract_entity_links

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  | Y |
| contract_id | INTEGER |  | Y |
| entity_type | VARCHAR(50) |  | Y |
| entity_id | INTEGER |  | Y |
| resolution_action | VARCHAR(20) |  | Y |
| confidence | INTEGER |  |  |
| created_by | INTEGER |  | Y |
| created_at | DATETIME |  | Y |

### contract_intake_entity_links

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  | Y |
| release_id | INTEGER |  | Y |
| contract_id | INTEGER |  | Y |
| resolution_run_id | INTEGER |  |  |
| entity_type | VARCHAR(50) |  | Y |
| entity_id | INTEGER |  |  |
| action | VARCHAR(20) |  | Y |
| confidence | INTEGER |  |  |
| created_by | INTEGER |  | Y |
| created_at | DATETIME |  | Y |

### contract_intake_release_links

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  | Y |
| release_id | INTEGER |  | Y |
| contract_id | INTEGER |  | Y |
| resolution_run_id | INTEGER |  |  |
| source | VARCHAR(50) |  | Y |
| status | VARCHAR(50) |  | Y |
| created_by | INTEGER |  | Y |
| created_at | DATETIME |  | Y |

### contract_parties

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| contract_id | INTEGER |  | Y |
| organization_id | INTEGER |  | Y |
| entity_type | VARCHAR(50) |  | Y |
| entity_id | INTEGER |  |  |
| external_name | VARCHAR(255) |  |  |
| role | VARCHAR(100) |  | Y |
| split_percent | NUMERIC(6, 3) |  |  |
| notes | TEXT |  |  |

### contract_release_links

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  | Y |
| contract_id | INTEGER |  | Y |
| release_id | INTEGER |  | Y |
| created_by | INTEGER |  | Y |
| created_at | DATETIME |  | Y |
| source | VARCHAR(50) |  | Y |
| status | VARCHAR(50) |  | Y |

### contract_split_groups

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| contract_id | INTEGER |  | Y |
| organization_id | INTEGER |  | Y |
| group_name | VARCHAR(100) |  | Y |
| group_type | VARCHAR(50) |  |  |
| notes | TEXT |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### contract_splits

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| group_id | INTEGER |  | Y |
| organization_id | INTEGER |  | Y |
| party_id | INTEGER |  |  |
| external_party_name | VARCHAR(255) |  |  |
| percent | NUMERIC(6, 3) |  | Y |
| notes | TEXT |  |  |

### contracts

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| contract_number | VARCHAR(50) |  | Y |
| organization_id | INTEGER |  | Y |
| title | VARCHAR(255) |  | Y |
| status | VARCHAR(50) |  | Y |
| type | VARCHAR(50) |  |  |
| start_date | DATE |  |  |
| end_date | DATE |  |  |
| signed_date | DATE |  |  |
| territory | VARCHAR(255) |  |  |
| exclusivity | BOOLEAN |  |  |
| notes | TEXT |  |  |
| royalty_description | TEXT |  |  |
| advances_amount | NUMERIC(10, 2) |  |  |
| advances_currency | VARCHAR(3) |  |  |
| recoupment_notes | TEXT |  |  |
| status_quo_override | VARCHAR(50) |  |  |
| created_by | INTEGER |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### distributors

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| name | VARCHAR(255) |  | Y |
| contact_email | VARCHAR(255) |  |  |
| contact_phone | VARCHAR(50) |  |  |
| website | VARCHAR(255) |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### documents

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| filename | VARCHAR(255) |  | Y |
| original_filename | VARCHAR(255) |  | Y |
| file_path | VARCHAR(500) |  | Y |
| file_type | VARCHAR(50) |  |  |
| mime_type | VARCHAR(100) |  |  |
| file_size | BIGINT |  |  |
| version | INTEGER |  |  |
| parent_document_id | INTEGER |  |  |
| organization_id | CHAR(32) |  | Y |
| checksum | VARCHAR(64) |  |  |
| is_deleted | BOOLEAN |  | Y |
| title | VARCHAR(255) |  |  |
| description | TEXT |  |  |
| tags | JSON |  |  |
| category | VARCHAR(100) |  |  |
| related_entity_type | VARCHAR(50) |  |  |
| related_entity_id | INTEGER |  |  |
| uploaded_by | INTEGER |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### events

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| title | VARCHAR(255) |  | Y |
| description | TEXT |  |  |
| event_type | VARCHAR(100) |  |  |
| status | VARCHAR(50) |  |  |
| start_datetime | DATETIME |  | Y |
| end_datetime | DATETIME |  |  |
| all_day | BOOLEAN |  |  |
| category | VARCHAR(100) |  |  |
| color | VARCHAR(20) |  |  |
| location | VARCHAR(255) |  |  |
| recurrence_rule | VARCHAR(500) |  |  |
| recurrence_end_date | DATETIME |  |  |
| reminder_minutes | INTEGER |  |  |
| related_entity_type | VARCHAR(50) |  |  |
| related_entity_id | INTEGER |  |  |
| created_by | INTEGER |  |  |
| is_deleted | BOOLEAN |  | Y |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### individual_organizations

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| individual_id | INTEGER | Y | Y |
| organization_id | INTEGER | Y | Y |

### individuals

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| first_name | VARCHAR(100) |  |  |
| last_name | VARCHAR(100) |  |  |
| email | VARCHAR(255) |  |  |
| phone | VARCHAR(50) |  |  |
| role | VARCHAR(100) |  |  |
| relationship_strength | VARCHAR(50) |  |  |
| image_url | VARCHAR(500) |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |
| organization_id | INTEGER |  | Y |

### labels

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| label_id | VARCHAR(50) |  |  |
| name | VARCHAR(255) |  | Y |
| address | TEXT |  |  |
| contact_email | VARCHAR(255) |  |  |
| contact_phone | VARCHAR(50) |  |  |
| website | VARCHAR(255) |  |  |
| logo_url | VARCHAR(255) |  |  |
| contact_person | VARCHAR(255) |  |  |
| artist_ids | JSON |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |
| organization_id | INTEGER |  |  |

### network_relationships

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| relationship_type | VARCHAR(100) |  |  |
| source_type | VARCHAR(50) |  |  |
| source_id | INTEGER |  |  |
| target_type | VARCHAR(50) |  |  |
| target_id | INTEGER |  |  |
| start_date | DATETIME |  |  |
| end_date | DATETIME |  |  |
| notes | TEXT |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### notes

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| title | VARCHAR(255) |  | Y |
| content | TEXT |  |  |
| content_markdown | TEXT |  |  |
| organization_id | CHAR(32) |  | Y |
| is_deleted | BOOLEAN |  | Y |
| tags | JSON |  |  |
| category | VARCHAR(100) |  |  |
| color | VARCHAR(20) |  |  |
| pinned | BOOLEAN |  |  |
| attachments | JSON |  |  |
| related_entity_type | VARCHAR(50) |  |  |
| related_entity_id | INTEGER |  |  |
| created_by | INTEGER |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### office_document_links

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| document_id | INTEGER |  | Y |
| entity_type | VARCHAR(50) |  | Y |
| entity_id | INTEGER |  | Y |
| created_at | DATETIME |  |  |

### office_documents

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| doc_type | VARCHAR(50) |  | Y |
| title | VARCHAR(255) |  |  |
| description | TEXT |  |  |
| storage_path | VARCHAR(500) |  | Y |
| storage_filename | VARCHAR(255) |  | Y |
| original_filename | VARCHAR(255) |  | Y |
| mime_type | VARCHAR(100) |  |  |
| file_size_bytes | BIGINT |  | Y |
| checksum | VARCHAR(64) |  |  |
| uploaded_by_user_id | INTEGER |  | Y |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### office_note_links

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| note_id | INTEGER |  | Y |
| entity_type | VARCHAR(50) |  | Y |
| entity_id | INTEGER |  | Y |
| created_at | DATETIME |  |  |

### office_notes

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| title | VARCHAR(255) |  |  |
| body | TEXT |  | Y |
| tags | VARCHAR(255) |  |  |
| created_by_user_id | INTEGER |  | Y |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### organizations

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| name | VARCHAR(255) |  | Y |
| org_type | VARCHAR(100) |  |  |
| website | VARCHAR(255) |  |  |
| address | TEXT |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |
| organization_id | INTEGER |  | Y |

### platforms

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| name | VARCHAR(255) |  | Y |
| platform_type | VARCHAR(100) |  |  |
| portal_url | VARCHAR(255) |  |  |
| account_reference | VARCHAR(255) |  |  |
| territory_coverage | TEXT |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### playlists

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| playlist_id | VARCHAR(50) |  |  |
| name | VARCHAR(255) |  | Y |
| description | TEXT |  |  |
| track_ids | JSON |  |  |
| is_public | BOOLEAN |  |  |
| share_link | VARCHAR(255) |  |  |
| play_count | INTEGER |  |  |
| created_by | INTEGER |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### pros

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| pro_id | VARCHAR(50) |  |  |
| name | VARCHAR(255) |  | Y |
| address | TEXT |  |  |
| contact_email | VARCHAR(255) |  |  |
| contact_phone | VARCHAR(50) |  |  |
| website | VARCHAR(255) |  |  |
| territory | VARCHAR(100) |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |
| organization_id | INTEGER |  |  |

### publishers

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| publisher_id | VARCHAR(50) |  |  |
| name | VARCHAR(255) |  | Y |
| address | TEXT |  |  |
| contact_person | VARCHAR(255) |  |  |
| contact_email | VARCHAR(255) |  |  |
| contact_phone | VARCHAR(50) |  |  |
| rights_type | VARCHAR(100) |  |  |
| artist_ids | JSON |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |
| organization_id | INTEGER |  |  |

### releases

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  |  |
| is_deleted | BOOLEAN |  | Y |
| release_id | VARCHAR(50) |  |  |
| title | VARCHAR(255) |  | Y |
| catalog_number | VARCHAR(50) |  |  |
| upc_code | VARCHAR(50) |  |  |
| release_date | DATE |  |  |
| release_type | VARCHAR(50) |  |  |
| cover_art_url | VARCHAR(500) |  |  |
| label_id | INTEGER |  |  |
| artist_id | INTEGER |  |  |
| artist_ids | JSON |  |  |
| credits | JSON |  |  |
| distributor_id | INTEGER |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |
| streaming_link | VARCHAR(500) |  |  |

### report_artifacts

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| report_run_id | INTEGER |  | Y |
| format | VARCHAR(10) |  | Y |
| storage_path | VARCHAR(500) |  | Y |
| filename | VARCHAR(255) |  | Y |
| mime_type | VARCHAR(100) |  | Y |
| file_size_bytes | INTEGER |  | Y |
| created_at | DATETIME |  |  |

### report_definitions

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| name | VARCHAR(255) |  | Y |
| description | TEXT |  |  |
| report_type | VARCHAR(100) |  | Y |
| config_json | TEXT |  | Y |
| created_by_user_id | INTEGER |  | Y |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### report_runs

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| report_definition_id | INTEGER |  |  |
| status | VARCHAR(50) |  | Y |
| requested_by_user_id | INTEGER |  | Y |
| parameters_json | TEXT |  | Y |
| row_count | INTEGER |  |  |
| error | TEXT |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### royalties

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| royalty_id | VARCHAR(50) |  |  |
| artist_id | INTEGER |  |  |
| work_id | INTEGER |  |  |
| track_id | INTEGER |  |  |
| source | VARCHAR(100) |  |  |
| amount | NUMERIC(15, 2) |  |  |
| currency | VARCHAR(3) |  |  |
| statement_date | DATE |  |  |
| fees | NUMERIC(15, 2) |  |  |
| advances | NUMERIC(15, 2) |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### status_quo_items

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| entity_type | VARCHAR(50) |  | Y |
| entity_id | INTEGER |  | Y |
| issue_type | VARCHAR(100) |  | Y |
| severity | VARCHAR(20) |  | Y |
| summary | VARCHAR(255) |  | Y |
| details_json | TEXT |  |  |
| created_at | DATETIME |  |  |
| resolved_at | DATETIME |  |  |
| resolved_by_user_id | INTEGER |  |  |

### tasks

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | CHAR(32) |  | Y |
| title | VARCHAR |  |  |
| description | TEXT |  |  |
| status | VARCHAR |  |  |
| priority | VARCHAR |  |  |
| due_date | DATETIME |  |  |
| assigned_to_user_id | INTEGER |  |  |
| created_by_user_id | INTEGER |  | Y |
| linked_entity_type | VARCHAR(50) |  |  |
| linked_entity_id | INTEGER |  |  |
| source_type | VARCHAR(50) |  |  |
| source_id | INTEGER |  |  |
| is_deleted | BOOLEAN |  | Y |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### track_releases

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| track_id | INTEGER | Y | Y |
| release_id | INTEGER | Y | Y |

### tracks

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| track_id | VARCHAR(50) |  |  |
| title | VARCHAR(255) |  | Y |
| duration | TIME |  |  |
| genre | VARCHAR(100) |  |  |
| release_date | DATE |  |  |
| isrc_code | VARCHAR(50) |  |  |
| streaming_link | VARCHAR(500) |  |  |
| artist_ids | JSON |  |  |
| credits | JSON |  |  |
| file_location | VARCHAR(500) |  |  |
| release_id | INTEGER |  |  |
| work_id | INTEGER |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |
| organization_id | INTEGER |  |  |

### users

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| email | VARCHAR(255) |  | Y |
| hashed_password | VARCHAR(255) |  | Y |
| full_name | VARCHAR(255) |  |  |
| avatar_url | VARCHAR(500) |  |  |
| is_active | BOOLEAN |  |  |
| is_superuser | BOOLEAN |  |  |
| role | VARCHAR(50) |  |  |
| organization_id | INTEGER |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |
| last_login | DATETIME |  |  |

### works

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | INTEGER | Y | Y |
| organization_id | INTEGER |  |  |
| is_deleted | BOOLEAN |  | Y |
| work_id | VARCHAR(50) |  |  |
| title | VARCHAR(255) |  | Y |
| iswc_code | VARCHAR(50) |  |  |
| composers | JSON |  |  |
| composers_text | TEXT |  |  |
| arrangers | JSON |  |  |
| arrangers_text | TEXT |  |  |
| publisher_id | INTEGER |  |  |
| pro_id | INTEGER |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### works_admin

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | CHAR(32) | Y | Y |
| organization_id | CHAR(32) |  | Y |
| work_id | INTEGER |  | Y |
| registration_status | VARCHAR(50) |  | Y |
| registered_with | VARCHAR(255) |  |  |
| registration_date | DATE |  |  |
| registration_reference | VARCHAR(255) |  |  |
| notes | TEXT |  |  |
| created_by | INTEGER |  |  |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

### works_admin_documents

| Column | Type | PK | NotNull |
|--------|------|----|--------|
| id | CHAR(32) | Y | Y |
| organization_id | CHAR(32) |  | Y |
| works_admin_id | CHAR(32) |  | Y |
| doc_type | VARCHAR(100) |  | Y |
| file_path | VARCHAR(500) |  | Y |
| file_name | VARCHAR(255) |  | Y |
| mime_type | VARCHAR(100) |  |  |
| size_bytes | INTEGER |  |  |
| checksum | VARCHAR(64) |  |  |
| uploaded_by | INTEGER |  |  |
| uploaded_at | DATETIME |  |  |

## Foreign Keys

| Table | From | References | To |
|-------|------|------------|----|
| activities | user_id | users | id |
| admin_backup_artifacts | created_by | users | id |
| admin_backup_restore_events | initiator_user_id | users | id |
| admin_restore_audit | user_id | users | id |
| ai_contract_documents | uploaded_by | users | id |
| ai_contract_resolution_links | run_id | ai_contract_resolution_runs | id |
| ai_contract_resolution_runs | user_id | users | id |
| ai_contract_resolution_runs | contract_id | contracts | id |
| ai_contract_work_links | contract_document_id | ai_contract_documents | id |
| ai_core_write_apply_events | run_id | ai_core_write_proposal_runs | id |
| ai_core_write_apply_events | user_id | users | id |
| ai_core_write_proposal_items | run_id | ai_core_write_proposal_runs | id |
| ai_core_write_proposal_runs | user_id | users | id |
| ai_messages | session_id | ai_sessions | id |
| ai_release_integration_links | run_id | ai_release_integration_runs | id |
| ai_release_integration_runs | user_id | users | id |
| ai_royalty_simulation_runs | user_id | users | id |
| ai_sessions | user_id | users | id |
| artists | pro_id | pros | id |
| artists | publisher_id | publishers | id |
| artists | label_id | labels | id |
| audit_logs | user_id | users | id |
| contract_assets | contract_id | contracts | id |
| contract_documents | contract_id | contracts | id |
| contract_entity_links | created_by | users | id |
| contract_entity_links | contract_id | contracts | id |
| contract_intake_entity_links | created_by | users | id |
| contract_intake_entity_links | resolution_run_id | ai_contract_resolution_runs | id |
| contract_intake_entity_links | contract_id | contracts | id |
| contract_intake_entity_links | release_id | releases | id |
| contract_intake_release_links | created_by | users | id |
| contract_intake_release_links | resolution_run_id | ai_contract_resolution_runs | id |
| contract_intake_release_links | contract_id | contracts | id |
| contract_intake_release_links | release_id | releases | id |
| contract_parties | contract_id | contracts | id |
| contract_release_links | created_by | users | id |
| contract_release_links | release_id | releases | id |
| contract_release_links | contract_id | contracts | id |
| contract_split_groups | contract_id | contracts | id |
| contract_splits | party_id | contract_parties | id |
| contract_splits | group_id | contract_split_groups | id |
| documents | uploaded_by | users | id |
| documents | parent_document_id | documents | id |
| events | created_by | users | id |
| individual_organizations | organization_id | organizations | id |
| individual_organizations | individual_id | individuals | id |
| notes | created_by | users | id |
| office_document_links | document_id | office_documents | id |
| office_documents | uploaded_by_user_id | users | id |
| office_note_links | note_id | office_notes | id |
| office_notes | created_by_user_id | users | id |
| playlists | created_by | users | id |
| releases | distributor_id | organizations | id |
| releases | artist_id | artists | id |
| releases | label_id | labels | id |
| report_artifacts | report_run_id | report_runs | id |
| report_definitions | created_by_user_id | users | id |
| report_runs | requested_by_user_id | users | id |
| report_runs | report_definition_id | report_definitions | id |
| royalties | track_id | tracks | id |
| royalties | work_id | works | id |
| royalties | artist_id | artists | id |
| status_quo_items | resolved_by_user_id | users | id |
| tasks | created_by_user_id | users | id |
| tasks | assigned_to_user_id | users | id |
| track_releases | release_id | releases | id |
| track_releases | track_id | tracks | id |
| tracks | work_id | works | id |
| tracks | release_id | releases | id |
| works | pro_id | pros | id |
| works | publisher_id | publishers | id |
| works_admin | work_id | works | id |
| works_admin_documents | works_admin_id | works_admin | id |

## Indexes

- **ix_activities_id** on `activities`: `CREATE INDEX ix_activities_id ON activities (id)`
- **ix_admin_backup_artifacts_backup_kind** on `admin_backup_artifacts`: `CREATE INDEX ix_admin_backup_artifacts_backup_kind ON admin_backup_artifacts (backup_kind)`
- **ix_admin_backup_artifacts_created_at** on `admin_backup_artifacts`: `CREATE INDEX ix_admin_backup_artifacts_created_at ON admin_backup_artifacts (created_at)`
- **ix_admin_backup_artifacts_created_by** on `admin_backup_artifacts`: `CREATE INDEX ix_admin_backup_artifacts_created_by ON admin_backup_artifacts (created_by)`
- **ix_admin_backup_artifacts_id** on `admin_backup_artifacts`: `CREATE INDEX ix_admin_backup_artifacts_id ON admin_backup_artifacts (id)`
- **ix_admin_backup_artifacts_is_pre_restore_snapshot** on `admin_backup_artifacts`: `CREATE INDEX ix_admin_backup_artifacts_is_pre_restore_snapshot ON admin_backup_artifacts (is_pre_restore_snapshot)`
- **ix_admin_backup_artifacts_organization_id** on `admin_backup_artifacts`: `CREATE INDEX ix_admin_backup_artifacts_organization_id ON admin_backup_artifacts (organization_id)`
- **ix_admin_backup_artifacts_sha256** on `admin_backup_artifacts`: `CREATE INDEX ix_admin_backup_artifacts_sha256 ON admin_backup_artifacts (sha256)`
- **ix_admin_backup_artifacts_source_backup_id** on `admin_backup_artifacts`: `CREATE INDEX ix_admin_backup_artifacts_source_backup_id ON admin_backup_artifacts (source_backup_id)`
- **ix_admin_backup_restore_events_backup_id** on `admin_backup_restore_events`: `CREATE INDEX ix_admin_backup_restore_events_backup_id ON admin_backup_restore_events (backup_id)`
- **ix_admin_backup_restore_events_created_at** on `admin_backup_restore_events`: `CREATE INDEX ix_admin_backup_restore_events_created_at ON admin_backup_restore_events (created_at)`
- **ix_admin_backup_restore_events_id** on `admin_backup_restore_events`: `CREATE INDEX ix_admin_backup_restore_events_id ON admin_backup_restore_events (id)`
- **ix_admin_backup_restore_events_initiator_org_id** on `admin_backup_restore_events`: `CREATE INDEX ix_admin_backup_restore_events_initiator_org_id ON admin_backup_restore_events (initiator_org_id)`
- **ix_admin_backup_restore_events_initiator_user_id** on `admin_backup_restore_events`: `CREATE INDEX ix_admin_backup_restore_events_initiator_user_id ON admin_backup_restore_events (initiator_user_id)`
- **ix_admin_backup_restore_events_snapshot_backup_id** on `admin_backup_restore_events`: `CREATE INDEX ix_admin_backup_restore_events_snapshot_backup_id ON admin_backup_restore_events (snapshot_backup_id)`
- **ix_admin_backup_restore_events_status** on `admin_backup_restore_events`: `CREATE INDEX ix_admin_backup_restore_events_status ON admin_backup_restore_events (status)`
- **ix_admin_restore_audit_backup_id** on `admin_restore_audit`: `CREATE INDEX ix_admin_restore_audit_backup_id ON admin_restore_audit (backup_id)`
- **ix_admin_restore_audit_created_at** on `admin_restore_audit`: `CREATE INDEX ix_admin_restore_audit_created_at ON admin_restore_audit (created_at)`
- **ix_admin_restore_audit_id** on `admin_restore_audit`: `CREATE INDEX ix_admin_restore_audit_id ON admin_restore_audit (id)`
- **ix_admin_restore_audit_organization_id** on `admin_restore_audit`: `CREATE INDEX ix_admin_restore_audit_organization_id ON admin_restore_audit (organization_id)`
- **ix_admin_restore_audit_pre_restore_snapshot_id** on `admin_restore_audit`: `CREATE INDEX ix_admin_restore_audit_pre_restore_snapshot_id ON admin_restore_audit (pre_restore_snapshot_id)`
- **ix_admin_restore_audit_request_hash** on `admin_restore_audit`: `CREATE INDEX ix_admin_restore_audit_request_hash ON admin_restore_audit (request_hash)`
- **ix_admin_restore_audit_result** on `admin_restore_audit`: `CREATE INDEX ix_admin_restore_audit_result ON admin_restore_audit (result)`
- **ix_admin_restore_audit_user_id** on `admin_restore_audit`: `CREATE INDEX ix_admin_restore_audit_user_id ON admin_restore_audit (user_id)`
- **ix_ai_audit_log_created_at** on `ai_audit_log`: `CREATE INDEX ix_ai_audit_log_created_at ON ai_audit_log (created_at)`
- **ix_ai_audit_log_id** on `ai_audit_log`: `CREATE INDEX ix_ai_audit_log_id ON ai_audit_log (id)`
- **ix_ai_audit_log_organization_id** on `ai_audit_log`: `CREATE INDEX ix_ai_audit_log_organization_id ON ai_audit_log (organization_id)`
- **ix_ai_audit_log_user_id** on `ai_audit_log`: `CREATE INDEX ix_ai_audit_log_user_id ON ai_audit_log (user_id)`
- **ix_ai_contract_documents_created_at** on `ai_contract_documents`: `CREATE INDEX ix_ai_contract_documents_created_at ON ai_contract_documents (created_at)`
- **ix_ai_contract_documents_file_hash** on `ai_contract_documents`: `CREATE INDEX ix_ai_contract_documents_file_hash ON ai_contract_documents (file_hash)`
- **ix_ai_contract_documents_id** on `ai_contract_documents`: `CREATE INDEX ix_ai_contract_documents_id ON ai_contract_documents (id)`
- **ix_ai_contract_documents_organization_id** on `ai_contract_documents`: `CREATE INDEX ix_ai_contract_documents_organization_id ON ai_contract_documents (organization_id)`
- **ix_ai_contract_documents_release_id** on `ai_contract_documents`: `CREATE INDEX ix_ai_contract_documents_release_id ON ai_contract_documents (release_id)`
- **ix_ai_contract_documents_uploaded_by** on `ai_contract_documents`: `CREATE INDEX ix_ai_contract_documents_uploaded_by ON ai_contract_documents (uploaded_by)`
- **ix_ai_contract_resolution_links_id** on `ai_contract_resolution_links`: `CREATE INDEX ix_ai_contract_resolution_links_id ON ai_contract_resolution_links (id)`
- **ix_ai_contract_resolution_links_run_id** on `ai_contract_resolution_links`: `CREATE INDEX ix_ai_contract_resolution_links_run_id ON ai_contract_resolution_links (run_id)`
- **ix_ai_contract_resolution_runs_contract_hash** on `ai_contract_resolution_runs`: `CREATE INDEX ix_ai_contract_resolution_runs_contract_hash ON ai_contract_resolution_runs (contract_hash)`
- **ix_ai_contract_resolution_runs_created_at** on `ai_contract_resolution_runs`: `CREATE INDEX ix_ai_contract_resolution_runs_created_at ON ai_contract_resolution_runs (created_at)`
- **ix_ai_contract_resolution_runs_id** on `ai_contract_resolution_runs`: `CREATE INDEX ix_ai_contract_resolution_runs_id ON ai_contract_resolution_runs (id)`
- **ix_ai_contract_resolution_runs_organization_id** on `ai_contract_resolution_runs`: `CREATE INDEX ix_ai_contract_resolution_runs_organization_id ON ai_contract_resolution_runs (organization_id)`
- **ix_ai_contract_work_links_contract_document_id** on `ai_contract_work_links`: `CREATE INDEX ix_ai_contract_work_links_contract_document_id ON ai_contract_work_links (contract_document_id)`
- **ix_ai_contract_work_links_created_at** on `ai_contract_work_links`: `CREATE INDEX ix_ai_contract_work_links_created_at ON ai_contract_work_links (created_at)`
- **ix_ai_contract_work_links_id** on `ai_contract_work_links`: `CREATE INDEX ix_ai_contract_work_links_id ON ai_contract_work_links (id)`
- **ix_ai_contract_work_links_organization_id** on `ai_contract_work_links`: `CREATE INDEX ix_ai_contract_work_links_organization_id ON ai_contract_work_links (organization_id)`
- **ix_ai_contract_work_links_work_id** on `ai_contract_work_links`: `CREATE INDEX ix_ai_contract_work_links_work_id ON ai_contract_work_links (work_id)`
- **ix_ai_core_write_apply_events_created_at** on `ai_core_write_apply_events`: `CREATE INDEX ix_ai_core_write_apply_events_created_at ON ai_core_write_apply_events (created_at)`
- **ix_ai_core_write_apply_events_id** on `ai_core_write_apply_events`: `CREATE INDEX ix_ai_core_write_apply_events_id ON ai_core_write_apply_events (id)`
- **ix_ai_core_write_apply_events_organization_id** on `ai_core_write_apply_events`: `CREATE INDEX ix_ai_core_write_apply_events_organization_id ON ai_core_write_apply_events (organization_id)`
- **ix_ai_core_write_apply_events_request_hash** on `ai_core_write_apply_events`: `CREATE INDEX ix_ai_core_write_apply_events_request_hash ON ai_core_write_apply_events (request_hash)`
- **ix_ai_core_write_apply_events_run_id** on `ai_core_write_apply_events`: `CREATE INDEX ix_ai_core_write_apply_events_run_id ON ai_core_write_apply_events (run_id)`
- **ix_ai_core_write_apply_events_status** on `ai_core_write_apply_events`: `CREATE INDEX ix_ai_core_write_apply_events_status ON ai_core_write_apply_events (status)`
- **ix_ai_core_write_apply_events_user_id** on `ai_core_write_apply_events`: `CREATE INDEX ix_ai_core_write_apply_events_user_id ON ai_core_write_apply_events (user_id)`
- **ix_ai_core_write_proposal_items_created_at** on `ai_core_write_proposal_items`: `CREATE INDEX ix_ai_core_write_proposal_items_created_at ON ai_core_write_proposal_items (created_at)`
- **ix_ai_core_write_proposal_items_entity_id** on `ai_core_write_proposal_items`: `CREATE INDEX ix_ai_core_write_proposal_items_entity_id ON ai_core_write_proposal_items (entity_id)`
- **ix_ai_core_write_proposal_items_entity_type** on `ai_core_write_proposal_items`: `CREATE INDEX ix_ai_core_write_proposal_items_entity_type ON ai_core_write_proposal_items (entity_type)`
- **ix_ai_core_write_proposal_items_id** on `ai_core_write_proposal_items`: `CREATE INDEX ix_ai_core_write_proposal_items_id ON ai_core_write_proposal_items (id)`
- **ix_ai_core_write_proposal_items_operation** on `ai_core_write_proposal_items`: `CREATE INDEX ix_ai_core_write_proposal_items_operation ON ai_core_write_proposal_items (operation)`
- **ix_ai_core_write_proposal_items_organization_id** on `ai_core_write_proposal_items`: `CREATE INDEX ix_ai_core_write_proposal_items_organization_id ON ai_core_write_proposal_items (organization_id)`
- **ix_ai_core_write_proposal_items_requires_user_review** on `ai_core_write_proposal_items`: `CREATE INDEX ix_ai_core_write_proposal_items_requires_user_review ON ai_core_write_proposal_items (requires_user_review)`
- **ix_ai_core_write_proposal_items_run_id** on `ai_core_write_proposal_items`: `CREATE INDEX ix_ai_core_write_proposal_items_run_id ON ai_core_write_proposal_items (run_id)`
- **ix_ai_core_write_proposal_runs_contract_document_id** on `ai_core_write_proposal_runs`: `CREATE INDEX ix_ai_core_write_proposal_runs_contract_document_id ON ai_core_write_proposal_runs (contract_document_id)`
- **ix_ai_core_write_proposal_runs_contract_id** on `ai_core_write_proposal_runs`: `CREATE INDEX ix_ai_core_write_proposal_runs_contract_id ON ai_core_write_proposal_runs (contract_id)`
- **ix_ai_core_write_proposal_runs_created_at** on `ai_core_write_proposal_runs`: `CREATE INDEX ix_ai_core_write_proposal_runs_created_at ON ai_core_write_proposal_runs (created_at)`
- **ix_ai_core_write_proposal_runs_id** on `ai_core_write_proposal_runs`: `CREATE INDEX ix_ai_core_write_proposal_runs_id ON ai_core_write_proposal_runs (id)`
- **ix_ai_core_write_proposal_runs_organization_id** on `ai_core_write_proposal_runs`: `CREATE INDEX ix_ai_core_write_proposal_runs_organization_id ON ai_core_write_proposal_runs (organization_id)`
- **ix_ai_core_write_proposal_runs_release_id** on `ai_core_write_proposal_runs`: `CREATE INDEX ix_ai_core_write_proposal_runs_release_id ON ai_core_write_proposal_runs (release_id)`
- **ix_ai_core_write_proposal_runs_request_hash** on `ai_core_write_proposal_runs`: `CREATE INDEX ix_ai_core_write_proposal_runs_request_hash ON ai_core_write_proposal_runs (request_hash)`
- **ix_ai_core_write_proposal_runs_user_id** on `ai_core_write_proposal_runs`: `CREATE INDEX ix_ai_core_write_proposal_runs_user_id ON ai_core_write_proposal_runs (user_id)`
- **ix_ai_link_commits_id** on `ai_link_commits`: `CREATE INDEX ix_ai_link_commits_id ON ai_link_commits (id)`
- **ix_ai_link_commits_organization_id** on `ai_link_commits`: `CREATE INDEX ix_ai_link_commits_organization_id ON ai_link_commits (organization_id)`
- **ix_ai_link_suggestions_id** on `ai_link_suggestions`: `CREATE INDEX ix_ai_link_suggestions_id ON ai_link_suggestions (id)`
- **ix_ai_link_suggestions_organization_id** on `ai_link_suggestions`: `CREATE INDEX ix_ai_link_suggestions_organization_id ON ai_link_suggestions (organization_id)`
- **ix_ai_link_suggestions_source_entity_id** on `ai_link_suggestions`: `CREATE INDEX ix_ai_link_suggestions_source_entity_id ON ai_link_suggestions (source_entity_id)`
- **ix_ai_link_suggestions_target_entity_id** on `ai_link_suggestions`: `CREATE INDEX ix_ai_link_suggestions_target_entity_id ON ai_link_suggestions (target_entity_id)`
- **ix_ai_messages_id** on `ai_messages`: `CREATE INDEX ix_ai_messages_id ON ai_messages (id)`
- **ix_ai_messages_session_id** on `ai_messages`: `CREATE INDEX ix_ai_messages_session_id ON ai_messages (session_id)`
- **ix_ai_release_integration_links_action** on `ai_release_integration_links`: `CREATE INDEX ix_ai_release_integration_links_action ON ai_release_integration_links (action)`
- **ix_ai_release_integration_links_created_at** on `ai_release_integration_links`: `CREATE INDEX ix_ai_release_integration_links_created_at ON ai_release_integration_links (created_at)`
- **ix_ai_release_integration_links_entity_id** on `ai_release_integration_links`: `CREATE INDEX ix_ai_release_integration_links_entity_id ON ai_release_integration_links (entity_id)`
- **ix_ai_release_integration_links_entity_type** on `ai_release_integration_links`: `CREATE INDEX ix_ai_release_integration_links_entity_type ON ai_release_integration_links (entity_type)`
- **ix_ai_release_integration_links_id** on `ai_release_integration_links`: `CREATE INDEX ix_ai_release_integration_links_id ON ai_release_integration_links (id)`
- **ix_ai_release_integration_links_organization_id** on `ai_release_integration_links`: `CREATE INDEX ix_ai_release_integration_links_organization_id ON ai_release_integration_links (organization_id)`
- **ix_ai_release_integration_links_run_id** on `ai_release_integration_links`: `CREATE INDEX ix_ai_release_integration_links_run_id ON ai_release_integration_links (run_id)`
- **ix_ai_release_integration_runs_contract_id** on `ai_release_integration_runs`: `CREATE INDEX ix_ai_release_integration_runs_contract_id ON ai_release_integration_runs (contract_id)`
- **ix_ai_release_integration_runs_created_at** on `ai_release_integration_runs`: `CREATE INDEX ix_ai_release_integration_runs_created_at ON ai_release_integration_runs (created_at)`
- **ix_ai_release_integration_runs_id** on `ai_release_integration_runs`: `CREATE INDEX ix_ai_release_integration_runs_id ON ai_release_integration_runs (id)`
- **ix_ai_release_integration_runs_organization_id** on `ai_release_integration_runs`: `CREATE INDEX ix_ai_release_integration_runs_organization_id ON ai_release_integration_runs (organization_id)`
- **ix_ai_release_integration_runs_release_id** on `ai_release_integration_runs`: `CREATE INDEX ix_ai_release_integration_runs_release_id ON ai_release_integration_runs (release_id)`
- **ix_ai_release_integration_runs_user_id** on `ai_release_integration_runs`: `CREATE INDEX ix_ai_release_integration_runs_user_id ON ai_release_integration_runs (user_id)`
- **ix_ai_royalty_runs_id** on `ai_royalty_runs`: `CREATE INDEX ix_ai_royalty_runs_id ON ai_royalty_runs (id)`
- **ix_ai_royalty_runs_organization_id** on `ai_royalty_runs`: `CREATE INDEX ix_ai_royalty_runs_organization_id ON ai_royalty_runs (organization_id)`
- **ix_ai_royalty_simulation_runs_contract_document_id** on `ai_royalty_simulation_runs`: `CREATE INDEX ix_ai_royalty_simulation_runs_contract_document_id ON ai_royalty_simulation_runs (contract_document_id)`
- **ix_ai_royalty_simulation_runs_created_at** on `ai_royalty_simulation_runs`: `CREATE INDEX ix_ai_royalty_simulation_runs_created_at ON ai_royalty_simulation_runs (created_at)`
- **ix_ai_royalty_simulation_runs_id** on `ai_royalty_simulation_runs`: `CREATE INDEX ix_ai_royalty_simulation_runs_id ON ai_royalty_simulation_runs (id)`
- **ix_ai_royalty_simulation_runs_organization_id** on `ai_royalty_simulation_runs`: `CREATE INDEX ix_ai_royalty_simulation_runs_organization_id ON ai_royalty_simulation_runs (organization_id)`
- **ix_ai_royalty_simulation_runs_release_id** on `ai_royalty_simulation_runs`: `CREATE INDEX ix_ai_royalty_simulation_runs_release_id ON ai_royalty_simulation_runs (release_id)`
- **ix_ai_royalty_simulation_runs_user_id** on `ai_royalty_simulation_runs`: `CREATE INDEX ix_ai_royalty_simulation_runs_user_id ON ai_royalty_simulation_runs (user_id)`
- **ix_ai_sessions_id** on `ai_sessions`: `CREATE INDEX ix_ai_sessions_id ON ai_sessions (id)`
- **ix_ai_sessions_organization_id** on `ai_sessions`: `CREATE INDEX ix_ai_sessions_organization_id ON ai_sessions (organization_id)`
- **ix_artists_artist_id** on `artists`: `CREATE UNIQUE INDEX ix_artists_artist_id ON artists (artist_id)`
- **ix_artists_id** on `artists`: `CREATE INDEX ix_artists_id ON artists (id)`
- **ix_artists_name** on `artists`: `CREATE INDEX ix_artists_name ON artists (name)`
- **ix_artists_organization_id** on `artists`: `CREATE INDEX ix_artists_organization_id ON artists (organization_id)`
- **ix_audit_logs_action** on `audit_logs`: `CREATE INDEX ix_audit_logs_action ON audit_logs(action)`
- **ix_audit_logs_created_at** on `audit_logs`: `CREATE INDEX ix_audit_logs_created_at ON audit_logs(created_at)`
- **ix_audit_logs_entity_type** on `audit_logs`: `CREATE INDEX ix_audit_logs_entity_type ON audit_logs(entity_type)`
- **ix_audit_logs_entity_uuid** on `audit_logs`: `CREATE INDEX ix_audit_logs_entity_uuid ON audit_logs(entity_uuid)`
- **ix_audit_logs_id** on `audit_logs`: `CREATE INDEX ix_audit_logs_id ON audit_logs(id)`
- **ix_audit_logs_organization_id** on `audit_logs`: `CREATE INDEX ix_audit_logs_organization_id ON audit_logs(organization_id)`
- **ix_contract_assets_id** on `contract_assets`: `CREATE INDEX ix_contract_assets_id ON contract_assets (id)`
- **ix_contract_assets_org_contract** on `contract_assets`: `CREATE INDEX ix_contract_assets_org_contract ON contract_assets (organization_id, contract_id)`
- **ix_contract_assets_organization_id** on `contract_assets`: `CREATE INDEX ix_contract_assets_organization_id ON contract_assets (organization_id)`
- **ix_contract_documents_id** on `contract_documents`: `CREATE INDEX ix_contract_documents_id ON contract_documents (id)`
- **ix_contract_documents_org_contract** on `contract_documents`: `CREATE INDEX ix_contract_documents_org_contract ON contract_documents (organization_id, contract_id)`
- **ix_contract_documents_organization_id** on `contract_documents`: `CREATE INDEX ix_contract_documents_organization_id ON contract_documents (organization_id)`
- **ix_contract_documents_unique_version** on `contract_documents`: `CREATE UNIQUE INDEX ix_contract_documents_unique_version ON contract_documents (contract_id, version)`
- **ix_contract_entity_links_contract_id** on `contract_entity_links`: `CREATE INDEX ix_contract_entity_links_contract_id ON contract_entity_links (contract_id)`
- **ix_contract_entity_links_created_at** on `contract_entity_links`: `CREATE INDEX ix_contract_entity_links_created_at ON contract_entity_links (created_at)`
- **ix_contract_entity_links_created_by** on `contract_entity_links`: `CREATE INDEX ix_contract_entity_links_created_by ON contract_entity_links (created_by)`
- **ix_contract_entity_links_entity_id** on `contract_entity_links`: `CREATE INDEX ix_contract_entity_links_entity_id ON contract_entity_links (entity_id)`
- **ix_contract_entity_links_entity_type** on `contract_entity_links`: `CREATE INDEX ix_contract_entity_links_entity_type ON contract_entity_links (entity_type)`
- **ix_contract_entity_links_id** on `contract_entity_links`: `CREATE INDEX ix_contract_entity_links_id ON contract_entity_links (id)`
- **ix_contract_entity_links_organization_id** on `contract_entity_links`: `CREATE INDEX ix_contract_entity_links_organization_id ON contract_entity_links (organization_id)`
- **ix_contract_intake_entity_links_contract_id** on `contract_intake_entity_links`: `CREATE INDEX ix_contract_intake_entity_links_contract_id ON contract_intake_entity_links (contract_id)`
- **ix_contract_intake_entity_links_created_at** on `contract_intake_entity_links`: `CREATE INDEX ix_contract_intake_entity_links_created_at ON contract_intake_entity_links (created_at)`
- **ix_contract_intake_entity_links_created_by** on `contract_intake_entity_links`: `CREATE INDEX ix_contract_intake_entity_links_created_by ON contract_intake_entity_links (created_by)`
- **ix_contract_intake_entity_links_entity_id** on `contract_intake_entity_links`: `CREATE INDEX ix_contract_intake_entity_links_entity_id ON contract_intake_entity_links (entity_id)`
- **ix_contract_intake_entity_links_entity_type** on `contract_intake_entity_links`: `CREATE INDEX ix_contract_intake_entity_links_entity_type ON contract_intake_entity_links (entity_type)`
- **ix_contract_intake_entity_links_id** on `contract_intake_entity_links`: `CREATE INDEX ix_contract_intake_entity_links_id ON contract_intake_entity_links (id)`
- **ix_contract_intake_entity_links_organization_id** on `contract_intake_entity_links`: `CREATE INDEX ix_contract_intake_entity_links_organization_id ON contract_intake_entity_links (organization_id)`
- **ix_contract_intake_entity_links_release_id** on `contract_intake_entity_links`: `CREATE INDEX ix_contract_intake_entity_links_release_id ON contract_intake_entity_links (release_id)`
- **ix_contract_intake_entity_links_resolution_run_id** on `contract_intake_entity_links`: `CREATE INDEX ix_contract_intake_entity_links_resolution_run_id ON contract_intake_entity_links (resolution_run_id)`
- **ix_contract_intake_release_links_contract_id** on `contract_intake_release_links`: `CREATE INDEX ix_contract_intake_release_links_contract_id ON contract_intake_release_links (contract_id)`
- **ix_contract_intake_release_links_created_at** on `contract_intake_release_links`: `CREATE INDEX ix_contract_intake_release_links_created_at ON contract_intake_release_links (created_at)`
- **ix_contract_intake_release_links_created_by** on `contract_intake_release_links`: `CREATE INDEX ix_contract_intake_release_links_created_by ON contract_intake_release_links (created_by)`
- **ix_contract_intake_release_links_id** on `contract_intake_release_links`: `CREATE INDEX ix_contract_intake_release_links_id ON contract_intake_release_links (id)`
- **ix_contract_intake_release_links_organization_id** on `contract_intake_release_links`: `CREATE INDEX ix_contract_intake_release_links_organization_id ON contract_intake_release_links (organization_id)`
- **ix_contract_intake_release_links_release_id** on `contract_intake_release_links`: `CREATE INDEX ix_contract_intake_release_links_release_id ON contract_intake_release_links (release_id)`
- **ix_contract_intake_release_links_resolution_run_id** on `contract_intake_release_links`: `CREATE INDEX ix_contract_intake_release_links_resolution_run_id ON contract_intake_release_links (resolution_run_id)`
- **ix_contract_parties_id** on `contract_parties`: `CREATE INDEX ix_contract_parties_id ON contract_parties (id)`
- **ix_contract_parties_org_contract** on `contract_parties`: `CREATE INDEX ix_contract_parties_org_contract ON contract_parties (organization_id, contract_id)`
- **ix_contract_parties_organization_id** on `contract_parties`: `CREATE INDEX ix_contract_parties_organization_id ON contract_parties (organization_id)`
- **ix_contract_release_links_contract_id** on `contract_release_links`: `CREATE INDEX ix_contract_release_links_contract_id ON contract_release_links (contract_id)`
- **ix_contract_release_links_created_at** on `contract_release_links`: `CREATE INDEX ix_contract_release_links_created_at ON contract_release_links (created_at)`
- **ix_contract_release_links_created_by** on `contract_release_links`: `CREATE INDEX ix_contract_release_links_created_by ON contract_release_links (created_by)`
- **ix_contract_release_links_id** on `contract_release_links`: `CREATE INDEX ix_contract_release_links_id ON contract_release_links (id)`
- **ix_contract_release_links_organization_id** on `contract_release_links`: `CREATE INDEX ix_contract_release_links_organization_id ON contract_release_links (organization_id)`
- **ix_contract_release_links_release_id** on `contract_release_links`: `CREATE INDEX ix_contract_release_links_release_id ON contract_release_links (release_id)`
- **ix_contract_split_groups_id** on `contract_split_groups`: `CREATE INDEX ix_contract_split_groups_id ON contract_split_groups (id)`
- **ix_contract_split_groups_org_contract** on `contract_split_groups`: `CREATE INDEX ix_contract_split_groups_org_contract ON contract_split_groups (organization_id, contract_id)`
- **ix_contract_split_groups_organization_id** on `contract_split_groups`: `CREATE INDEX ix_contract_split_groups_organization_id ON contract_split_groups (organization_id)`
- **ix_contract_splits_id** on `contract_splits`: `CREATE INDEX ix_contract_splits_id ON contract_splits (id)`
- **ix_contract_splits_org_group** on `contract_splits`: `CREATE INDEX ix_contract_splits_org_group ON contract_splits (organization_id, group_id)`
- **ix_contract_splits_organization_id** on `contract_splits`: `CREATE INDEX ix_contract_splits_organization_id ON contract_splits (organization_id)`
- **ix_contracts_id** on `contracts`: `CREATE INDEX ix_contracts_id ON contracts (id)`
- **ix_contracts_org_number** on `contracts`: `CREATE UNIQUE INDEX ix_contracts_org_number ON contracts (organization_id, contract_number)`
- **ix_contracts_organization_id** on `contracts`: `CREATE INDEX ix_contracts_organization_id ON contracts (organization_id)`
- **ix_distributors_id** on `distributors`: `CREATE INDEX ix_distributors_id ON distributors (id)`
- **ix_distributors_name** on `distributors`: `CREATE INDEX ix_distributors_name ON distributors (name)`
- **ix_documents_category** on `documents`: `CREATE INDEX ix_documents_category ON documents (category)`
- **ix_documents_file_type** on `documents`: `CREATE INDEX ix_documents_file_type ON documents (file_type)`
- **ix_documents_id** on `documents`: `CREATE INDEX ix_documents_id ON documents (id)`
- **ix_documents_organization_id** on `documents`: `CREATE INDEX ix_documents_organization_id ON documents (organization_id)`
- **ix_events_category** on `events`: `CREATE INDEX ix_events_category ON events (category)`
- **ix_events_event_type** on `events`: `CREATE INDEX ix_events_event_type ON events (event_type)`
- **ix_events_id** on `events`: `CREATE INDEX ix_events_id ON events (id)`
- **ix_events_organization_id** on `events`: `CREATE INDEX ix_events_organization_id ON events (organization_id)`
- **ix_events_start_datetime** on `events`: `CREATE INDEX ix_events_start_datetime ON events (start_datetime)`
- **ix_events_status** on `events`: `CREATE INDEX ix_events_status ON events (status)`
- **ix_events_title** on `events`: `CREATE INDEX ix_events_title ON events (title)`
- **ix_individuals_email** on `individuals`: `CREATE INDEX ix_individuals_email ON individuals (email)`
- **ix_individuals_id** on `individuals`: `CREATE INDEX ix_individuals_id ON individuals (id)`
- **ix_individuals_organization_id** on `individuals`: `CREATE INDEX ix_individuals_organization_id ON individuals (organization_id)`
- **ix_labels_id** on `labels`: `CREATE INDEX ix_labels_id ON labels (id)`
- **ix_labels_label_id** on `labels`: `CREATE UNIQUE INDEX ix_labels_label_id ON labels (label_id)`
- **ix_labels_name** on `labels`: `CREATE INDEX ix_labels_name ON labels (name)`
- **ix_network_relationships_id** on `network_relationships`: `CREATE INDEX ix_network_relationships_id ON network_relationships (id)`
- **ix_notes_category** on `notes`: `CREATE INDEX ix_notes_category ON notes (category)`
- **ix_notes_id** on `notes`: `CREATE INDEX ix_notes_id ON notes (id)`
- **ix_notes_organization_id** on `notes`: `CREATE INDEX ix_notes_organization_id ON notes (organization_id)`
- **ix_notes_pinned** on `notes`: `CREATE INDEX ix_notes_pinned ON notes (pinned)`
- **ix_notes_title** on `notes`: `CREATE INDEX ix_notes_title ON notes (title)`
- **ix_office_document_links_document_id** on `office_document_links`: `CREATE INDEX ix_office_document_links_document_id ON office_document_links (document_id)`
- **ix_office_document_links_entity_id** on `office_document_links`: `CREATE INDEX ix_office_document_links_entity_id ON office_document_links (entity_id)`
- **ix_office_document_links_entity_type** on `office_document_links`: `CREATE INDEX ix_office_document_links_entity_type ON office_document_links (entity_type)`
- **ix_office_document_links_id** on `office_document_links`: `CREATE INDEX ix_office_document_links_id ON office_document_links (id)`
- **ix_office_document_links_organization_id** on `office_document_links`: `CREATE INDEX ix_office_document_links_organization_id ON office_document_links (organization_id)`
- **ix_office_documents_doc_type** on `office_documents`: `CREATE INDEX ix_office_documents_doc_type ON office_documents (doc_type)`
- **ix_office_documents_id** on `office_documents`: `CREATE INDEX ix_office_documents_id ON office_documents (id)`
- **ix_office_documents_organization_id** on `office_documents`: `CREATE INDEX ix_office_documents_organization_id ON office_documents (organization_id)`
- **ix_office_note_links_entity_id** on `office_note_links`: `CREATE INDEX ix_office_note_links_entity_id ON office_note_links (entity_id)`
- **ix_office_note_links_entity_type** on `office_note_links`: `CREATE INDEX ix_office_note_links_entity_type ON office_note_links (entity_type)`
- **ix_office_note_links_id** on `office_note_links`: `CREATE INDEX ix_office_note_links_id ON office_note_links (id)`
- **ix_office_note_links_note_id** on `office_note_links`: `CREATE INDEX ix_office_note_links_note_id ON office_note_links (note_id)`
- **ix_office_note_links_organization_id** on `office_note_links`: `CREATE INDEX ix_office_note_links_organization_id ON office_note_links (organization_id)`
- **ix_office_notes_id** on `office_notes`: `CREATE INDEX ix_office_notes_id ON office_notes (id)`
- **ix_office_notes_organization_id** on `office_notes`: `CREATE INDEX ix_office_notes_organization_id ON office_notes (organization_id)`
- **ix_organizations_id** on `organizations`: `CREATE INDEX ix_organizations_id ON organizations (id)`
- **ix_organizations_name** on `organizations`: `CREATE INDEX ix_organizations_name ON organizations (name)`
- **ix_organizations_org_type** on `organizations`: `CREATE INDEX ix_organizations_org_type ON organizations (org_type)`
- **ix_organizations_organization_id** on `organizations`: `CREATE INDEX ix_organizations_organization_id ON organizations (organization_id)`
- **ix_platforms_id** on `platforms`: `CREATE INDEX ix_platforms_id ON platforms (id)`
- **ix_platforms_name** on `platforms`: `CREATE INDEX ix_platforms_name ON platforms (name)`
- **ix_platforms_platform_type** on `platforms`: `CREATE INDEX ix_platforms_platform_type ON platforms (platform_type)`
- **ix_playlists_id** on `playlists`: `CREATE INDEX ix_playlists_id ON playlists (id)`
- **ix_playlists_name** on `playlists`: `CREATE INDEX ix_playlists_name ON playlists (name)`
- **ix_playlists_playlist_id** on `playlists`: `CREATE UNIQUE INDEX ix_playlists_playlist_id ON playlists (playlist_id)`
- **ix_pros_id** on `pros`: `CREATE INDEX ix_pros_id ON pros (id)`
- **ix_pros_name** on `pros`: `CREATE INDEX ix_pros_name ON pros (name)`
- **ix_pros_pro_id** on `pros`: `CREATE UNIQUE INDEX ix_pros_pro_id ON pros (pro_id)`
- **ix_publishers_id** on `publishers`: `CREATE INDEX ix_publishers_id ON publishers (id)`
- **ix_publishers_name** on `publishers`: `CREATE INDEX ix_publishers_name ON publishers (name)`
- **ix_publishers_publisher_id** on `publishers`: `CREATE UNIQUE INDEX ix_publishers_publisher_id ON publishers (publisher_id)`
- **ix_releases_catalog_number** on `releases`: `CREATE UNIQUE INDEX ix_releases_catalog_number ON releases (catalog_number)`
- **ix_releases_id** on `releases`: `CREATE INDEX ix_releases_id ON releases (id)`
- **ix_releases_organization_id** on `releases`: `CREATE INDEX ix_releases_organization_id ON releases (organization_id)`
- **ix_releases_release_id** on `releases`: `CREATE UNIQUE INDEX ix_releases_release_id ON releases (release_id)`
- **ix_releases_title** on `releases`: `CREATE INDEX ix_releases_title ON releases (title)`
- **ix_report_artifacts_id** on `report_artifacts`: `CREATE INDEX ix_report_artifacts_id ON report_artifacts (id)`
- **ix_report_artifacts_organization_id** on `report_artifacts`: `CREATE INDEX ix_report_artifacts_organization_id ON report_artifacts (organization_id)`
- **ix_report_artifacts_report_run_id** on `report_artifacts`: `CREATE INDEX ix_report_artifacts_report_run_id ON report_artifacts (report_run_id)`
- **ix_report_definitions_id** on `report_definitions`: `CREATE INDEX ix_report_definitions_id ON report_definitions (id)`
- **ix_report_definitions_organization_id** on `report_definitions`: `CREATE INDEX ix_report_definitions_organization_id ON report_definitions (organization_id)`
- **ix_report_definitions_report_type** on `report_definitions`: `CREATE INDEX ix_report_definitions_report_type ON report_definitions (report_type)`
- **ix_report_runs_id** on `report_runs`: `CREATE INDEX ix_report_runs_id ON report_runs (id)`
- **ix_report_runs_organization_id** on `report_runs`: `CREATE INDEX ix_report_runs_organization_id ON report_runs (organization_id)`
- **ix_report_runs_report_definition_id** on `report_runs`: `CREATE INDEX ix_report_runs_report_definition_id ON report_runs (report_definition_id)`
- **ix_report_runs_status** on `report_runs`: `CREATE INDEX ix_report_runs_status ON report_runs (status)`
- **ix_royalties_id** on `royalties`: `CREATE INDEX ix_royalties_id ON royalties (id)`
- **ix_royalties_royalty_id** on `royalties`: `CREATE UNIQUE INDEX ix_royalties_royalty_id ON royalties (royalty_id)`
- **ix_royalties_source** on `royalties`: `CREATE INDEX ix_royalties_source ON royalties (source)`
- **ix_royalties_statement_date** on `royalties`: `CREATE INDEX ix_royalties_statement_date ON royalties (statement_date)`
- **ix_status_quo_items_entity_id** on `status_quo_items`: `CREATE INDEX ix_status_quo_items_entity_id ON status_quo_items (entity_id)`
- **ix_status_quo_items_entity_type** on `status_quo_items`: `CREATE INDEX ix_status_quo_items_entity_type ON status_quo_items (entity_type)`
- **ix_status_quo_items_id** on `status_quo_items`: `CREATE INDEX ix_status_quo_items_id ON status_quo_items (id)`
- **ix_status_quo_items_issue_type** on `status_quo_items`: `CREATE INDEX ix_status_quo_items_issue_type ON status_quo_items (issue_type)`
- **ix_status_quo_items_organization_id** on `status_quo_items`: `CREATE INDEX ix_status_quo_items_organization_id ON status_quo_items (organization_id)`
- **ix_tasks_id** on `tasks`: `CREATE INDEX ix_tasks_id ON tasks (id)`
- **ix_tasks_organization_id** on `tasks`: `CREATE INDEX ix_tasks_organization_id ON tasks (organization_id)`
- **ix_tasks_source_id** on `tasks`: `CREATE INDEX ix_tasks_source_id ON tasks (source_id)`
- **ix_tasks_source_type** on `tasks`: `CREATE INDEX ix_tasks_source_type ON tasks (source_type)`
- **ix_tasks_title** on `tasks`: `CREATE INDEX ix_tasks_title ON tasks (title)`
- **ix_tracks_genre** on `tracks`: `CREATE INDEX ix_tracks_genre ON tracks (genre)`
- **ix_tracks_id** on `tracks`: `CREATE INDEX ix_tracks_id ON tracks (id)`
- **ix_tracks_title** on `tracks`: `CREATE INDEX ix_tracks_title ON tracks (title)`
- **ix_tracks_track_id** on `tracks`: `CREATE UNIQUE INDEX ix_tracks_track_id ON tracks (track_id)`
- **ix_users_email** on `users`: `CREATE UNIQUE INDEX ix_users_email ON users (email)`
- **ix_users_id** on `users`: `CREATE INDEX ix_users_id ON users (id)`
- **ix_users_organization_id** on `users`: `CREATE INDEX ix_users_organization_id ON users (organization_id)`
- **ix_works_admin_documents_organization_id** on `works_admin_documents`: `CREATE INDEX ix_works_admin_documents_organization_id ON works_admin_documents (organization_id)`
- **ix_works_admin_org_work** on `works_admin`: `CREATE UNIQUE INDEX ix_works_admin_org_work ON works_admin (organization_id, work_id)`
- **ix_works_id** on `works`: `CREATE INDEX ix_works_id ON works (id)`
- **ix_works_organization_id** on `works`: `CREATE INDEX ix_works_organization_id ON works (organization_id)`
- **ix_works_title** on `works`: `CREATE INDEX ix_works_title ON works (title)`
- **ix_works_work_id** on `works`: `CREATE UNIQUE INDEX ix_works_work_id ON works (work_id)`

## Triggers

_None_

## Views

_None_
