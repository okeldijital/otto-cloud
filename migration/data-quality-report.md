# Data Quality Report

**Source:** `/Users/m2krproduction/.otto/data/db/otto.sqlite.corrupt_backup_1771348830`
**Generated:** 2026-07-18T12:47:40.762Z

Legacy data is assumed imperfect. The migrator adapts (null FKs, duplicates, bad dates).

## activities (4 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| user_id | 0.0% | 0.0% |
| action | 0.0% | 0.0% |
| entity_type | 0.0% | 0.0% |
| entity_id | 0.0% | 0.0% |
| entity_name | 0.0% | 0.0% |
| timestamp | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## admin_backup_artifacts (3 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| organization_id | 0.0% | 0.0% |
| created_by | 0.0% | 0.0% |
| backup_kind | 0.0% | 0.0% |
| filename | 0.0% | 0.0% |
| file_path | 0.0% | 0.0% |
| size_bytes | 0.0% | 0.0% |
| sha256 | 0.0% | 0.0% |
| is_pre_restore_snapshot | 0.0% | 0.0% |
| source_backup_id | 100.0% | 0.0% |
| created_at | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## admin_backup_restore_events (10 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| backup_id | 0.0% | 0.0% |
| snapshot_backup_id | 0.0% | 0.0% |
| initiator_user_id | 0.0% | 0.0% |
| initiator_org_id | 0.0% | 0.0% |
| status | 0.0% | 0.0% |
| error | 50.0% | 0.0% |
| duration_ms | 0.0% | 0.0% |
| created_at | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## admin_restore_audit (42 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| organization_id | 0.0% | 0.0% |
| user_id | 0.0% | 0.0% |
| backup_id | 0.0% | 0.0% |
| pre_restore_snapshot_id | 0.0% | 0.0% |
| request_hash | 0.0% | 0.0% |
| result | 0.0% | 0.0% |
| error_hash | 61.9% | 0.0% |
| created_at | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## ai_audit_log (405 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| organization_id | 0.0% | 0.0% |
| user_id | 0.0% | 0.0% |
| action | 0.0% | 0.0% |
| tool | 0.2% | 0.0% |
| request_hash | 0.0% | 0.0% |
| created_at | 0.0% | 0.0% |
| parser_version | 2.2% | 0.0% |

- Duplicate PK groups on `id`: **0**

## ai_contract_resolution_links (5 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| run_id | 0.0% | 0.0% |
| entity_type | 0.0% | 0.0% |
| entity_id | 100.0% | 0.0% |
| action | 0.0% | 0.0% |
| confidence | 60.0% | 0.0% |
| rationale | 0.0% | 0.0% |
| created_at | 0.0% | 0.0% |
| display_name | 60.0% | 0.0% |
| name | 100.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## ai_contract_resolution_runs (90 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| organization_id | 0.0% | 0.0% |
| user_id | 0.0% | 0.0% |
| contract_hash | 0.0% | 0.0% |
| extractor_version | 0.0% | 0.0% |
| linker_version | 0.0% | 0.0% |
| created_at | 0.0% | 0.0% |
| splits_total | 100.0% | 0.0% |
| warnings | 100.0% | 0.0% |
| contract_id | 100.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## ai_core_write_apply_events (18 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| organization_id | 0.0% | 0.0% |
| user_id | 0.0% | 0.0% |
| run_id | 0.0% | 0.0% |
| request_hash | 0.0% | 0.0% |
| status | 0.0% | 0.0% |
| applied_count | 0.0% | 0.0% |
| created_count | 0.0% | 0.0% |
| conflict_count | 0.0% | 0.0% |
| details_json | 0.0% | 0.0% |
| created_at | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## ai_core_write_proposal_items (36 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| organization_id | 0.0% | 0.0% |
| run_id | 0.0% | 0.0% |
| entity_type | 0.0% | 0.0% |
| entity_id | 66.7% | 0.0% |
| operation | 0.0% | 0.0% |
| patch_json | 0.0% | 0.0% |
| conflicts_json | 0.0% | 0.0% |
| safe_defaults_json | 0.0% | 0.0% |
| requires_user_review | 0.0% | 0.0% |
| created_at | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## ai_core_write_proposal_runs (16 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| organization_id | 0.0% | 0.0% |
| user_id | 0.0% | 0.0% |
| contract_id | 0.0% | 0.0% |
| release_id | 100.0% | 0.0% |
| contract_document_id | 100.0% | 0.0% |
| request_hash | 0.0% | 0.0% |
| parser_version | 0.0% | 0.0% |
| linker_version | 0.0% | 0.0% |
| planner_version | 0.0% | 0.0% |
| created_at | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## ai_messages (2 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| session_id | 0.0% | 0.0% |
| role | 0.0% | 0.0% |
| content | 0.0% | 0.0% |
| created_at | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## ai_sessions (1 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| organization_id | 0.0% | 0.0% |
| user_id | 0.0% | 0.0% |
| created_at | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## alembic_version (1 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| version_num | 0.0% | 0.0% |

- Duplicate PK groups on `version_num`: **0**

## artists (163 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| organization_id | 0.0% | 0.0% |
| is_deleted | 0.0% | 0.0% |
| artist_id | 85.3% | 0.0% |
| name | 0.0% | 0.0% |
| aka | 55.8% | 0.0% |
| nationality | 94.5% | 0.6% |
| id_number | 94.5% | 0.6% |
| ipi_number | 107.4% | 0.6% |
| contact_email | 107.4% | 0.6% |
| contact_phone | 107.4% | 0.6% |
| physical_address | 107.4% | 0.6% |
| banking_details | 23.9% | 0.0% |
| profile_image_url | 107.4% | 0.6% |
| streaming_links | 23.9% | 0.0% |
| social_media | 23.9% | 0.0% |

- Duplicate PK groups on `id`: **0**

## audit_logs (565 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| action | 0.0% | 0.0% |
| entity_type | 0.0% | 0.0% |
| entity_id | 0.0% | 0.0% |
| entity_uuid | 100.0% | 0.0% |
| entity_name | 100.0% | 0.0% |
| organization_id | 0.0% | 0.0% |
| changes | 0.0% | 0.0% |
| user_id | 0.0% | 0.0% |
| ip_address | 100.0% | 0.0% |
| user_agent | 100.0% | 0.0% |
| created_at | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## contract_parties (9 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| contract_id | 0.0% | 0.0% |
| organization_id | 0.0% | 0.0% |
| entity_type | 0.0% | 0.0% |
| entity_id | 100.0% | 0.0% |
| external_name | 0.0% | 0.0% |
| role | 0.0% | 0.0% |
| split_percent | 100.0% | 0.0% |
| notes | 100.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## contracts (24 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| contract_number | 0.0% | 0.0% |
| organization_id | 0.0% | 0.0% |
| title | 0.0% | 0.0% |
| status | 0.0% | 0.0% |
| type | 58.3% | 0.0% |
| start_date | 58.3% | 0.0% |
| end_date | 58.3% | 0.0% |
| signed_date | 62.5% | 0.0% |
| territory | 20.8% | 0.0% |
| exclusivity | 0.0% | 0.0% |
| notes | 62.5% | 0.0% |
| royalty_description | 62.5% | 0.0% |
| advances_amount | 62.5% | 0.0% |
| advances_currency | 0.0% | 0.0% |
| recoupment_notes | 62.5% | 0.0% |

- Duplicate PK groups on `id`: **0**

## individuals (18 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| first_name | 0.0% | 0.0% |
| last_name | 0.0% | 0.0% |
| email | 11.1% | 77.8% |
| phone | 100.0% | 0.0% |
| role | 88.9% | 0.0% |
| relationship_strength | 0.0% | 0.0% |
| image_url | 100.0% | 0.0% |
| created_at | 0.0% | 0.0% |
| updated_at | 88.9% | 0.0% |
| organization_id | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## labels (14 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| label_id | 7.1% | 0.0% |
| name | 0.0% | 0.0% |
| address | 92.9% | 7.1% |
| contact_email | 92.9% | 0.0% |
| contact_phone | 92.9% | 7.1% |
| website | 92.9% | 0.0% |
| logo_url | 92.9% | 0.0% |
| contact_person | 92.9% | 0.0% |
| artist_ids | 92.9% | 0.0% |
| created_at | 0.0% | 0.0% |
| updated_at | 92.9% | 0.0% |
| organization_id | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## organizations (28 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| name | 0.0% | 0.0% |
| org_type | 7.1% | 0.0% |
| website | 96.4% | 3.6% |
| address | 96.4% | 3.6% |
| created_at | 0.0% | 0.0% |
| updated_at | 100.0% | 0.0% |
| organization_id | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## pros (13 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| pro_id | 0.0% | 0.0% |
| name | 0.0% | 0.0% |
| address | 100.0% | 0.0% |
| contact_email | 100.0% | 0.0% |
| contact_phone | 100.0% | 0.0% |
| website | 100.0% | 0.0% |
| territory | 100.0% | 0.0% |
| created_at | 0.0% | 0.0% |
| updated_at | 100.0% | 0.0% |
| organization_id | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## publishers (13 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| publisher_id | 0.0% | 0.0% |
| name | 0.0% | 0.0% |
| address | 100.0% | 0.0% |
| contact_person | 100.0% | 0.0% |
| contact_email | 100.0% | 0.0% |
| contact_phone | 100.0% | 0.0% |
| rights_type | 100.0% | 0.0% |
| artist_ids | 100.0% | 0.0% |
| created_at | 0.0% | 0.0% |
| updated_at | 100.0% | 0.0% |
| organization_id | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## releases (104 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| organization_id | 2.9% | 0.0% |
| is_deleted | 0.0% | 0.0% |
| release_id | 76.9% | 0.0% |
| title | 0.0% | 0.0% |
| catalog_number | 49.0% | 0.0% |
| upc_code | 23.1% | 0.0% |
| release_date | 18.3% | 0.0% |
| release_type | 18.3% | 0.0% |
| cover_art_url | 29.8% | 0.0% |
| label_id | 12.5% | 0.0% |
| artist_id | 76.9% | 0.0% |
| artist_ids | 29.8% | 0.0% |
| credits | 37.5% | 0.0% |
| distributor_id | 30.8% | 0.0% |
| created_at | 11.5% | 0.0% |

- Duplicate PK groups on `id`: **0**
- Orphan FK `artist_id` → `artists.id`: **12**

## track_releases (3 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| track_id | 0.0% | 0.0% |
| release_id | 0.0% | 0.0% |

- Duplicate PK groups on `track_id`: **0**

## tracks (389 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| track_id | 1.0% | 0.0% |
| title | 0.0% | 0.0% |
| duration | 5.7% | 0.0% |
| genre | 7.2% | 0.0% |
| release_date | 19.8% | 0.0% |
| isrc_code | 0.0% | 0.0% |
| streaming_link | 20.1% | 0.0% |
| artist_ids | 5.7% | 0.0% |
| credits | 31.1% | 0.0% |
| file_location | 100.0% | 0.0% |
| release_id | 2.1% | 0.0% |
| work_id | 94.3% | 0.0% |
| created_at | 0.0% | 0.0% |
| updated_at | 65.0% | 0.0% |
| organization_id | 0.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## users (6 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| email | 0.0% | 0.0% |
| hashed_password | 0.0% | 0.0% |
| full_name | 0.0% | 0.0% |
| avatar_url | 100.0% | 0.0% |
| is_active | 0.0% | 0.0% |
| is_superuser | 0.0% | 0.0% |
| role | 0.0% | 0.0% |
| organization_id | 0.0% | 0.0% |
| created_at | 0.0% | 0.0% |
| updated_at | 50.0% | 0.0% |
| last_login | 100.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

## works (25 rows)

| Column | Null % | Empty string % |
|--------|-------:|---------------:|
| id | 0.0% | 0.0% |
| organization_id | 0.0% | 0.0% |
| is_deleted | 0.0% | 0.0% |
| work_id | 4.0% | 0.0% |
| title | 0.0% | 0.0% |
| iswc_code | 96.0% | 0.0% |
| composers | 96.0% | 0.0% |
| composers_text | 96.0% | 4.0% |
| arrangers | 96.0% | 0.0% |
| arrangers_text | 96.0% | 4.0% |
| publisher_id | 4.0% | 0.0% |
| pro_id | 4.0% | 0.0% |
| created_at | 0.0% | 0.0% |
| updated_at | 100.0% | 0.0% |

- Duplicate PK groups on `id`: **0**

