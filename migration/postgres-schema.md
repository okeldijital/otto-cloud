# PostgreSQL (Prisma) Schema

**Generated:** 2026-07-18T12:48:30.418Z

| Model | DB Table | Scalar Fields |
|-------|----------|--------------:|
| User | users | 14 |
| activities | activities | 7 |
| admin_backup_artifacts | admin_backup_artifacts | 12 |
| admin_backup_restore_events | admin_backup_restore_events | 10 |
| admin_restore_audit | admin_restore_audit | 10 |
| ai_audit_log | ai_audit_log | 9 |
| ai_contract_attach_links | ai_contract_attach_links | 10 |
| ai_contract_attach_runs | ai_contract_attach_runs | 9 |
| ai_contract_documents | ai_contract_documents | 8 |
| ai_contract_drafts | ai_contract_drafts | 12 |
| ai_contract_resolution_links | ai_contract_resolution_links | 9 |
| ai_contract_resolution_runs | ai_contract_resolution_runs | 8 |
| ai_contract_work_links | ai_contract_work_links | 8 |
| ai_core_write_apply_events | ai_core_write_apply_events | 12 |
| ai_core_write_proposal_items | ai_core_write_proposal_items | 12 |
| ai_core_write_proposal_runs | ai_core_write_proposal_runs | 12 |
| ai_messages | ai_messages | 6 |
| ai_release_integration_links | ai_release_integration_links | 12 |
| ai_release_integration_runs | ai_release_integration_runs | 9 |
| ai_royalty_simulation_runs | ai_royalty_simulation_runs | 13 |
| ai_sessions | ai_sessions | 5 |
| alembic_version | alembic_version | 1 |
| artist_memberships | artist_memberships | 6 |
| artists | artists | 25 |
| audit_logs | audit_logs | 13 |
| contract_assets | contract_assets | 8 |
| contract_documents | contract_documents | 12 |
| contract_intake_release_links | contract_intake_release_links | 7 |
| contract_parties | contract_parties | 10 |
| contract_split_groups | contract_split_groups | 9 |
| contract_splits | contract_splits | 8 |
| contract_track_links | contract_track_links | 6 |
| contracts | contracts | 21 |
| documents | documents | 22 |
| events | events | 22 |
| individual_organizations | individual_organizations | 2 |
| individuals | individuals | 12 |
| jobs | jobs | 10 |
| labels | labels | 12 |
| network_relationships | network_relationships | 11 |
| notes | notes | 17 |
| office_document_links | office_document_links | 6 |
| office_documents | office_documents | 15 |
| office_note_links | office_note_links | 7 |
| office_notes | office_notes | 9 |
| organizations | organizations | 11 |
| sso_providers | sso_providers | 11 |
| plans | plans | 11 |
| platforms | platforms | 8 |
| playing_with_neon | playing_with_neon | 3 |
| playlists | playlists | 12 |
| pros | pros | 10 |
| publishers | publishers | 11 |
| releases | releases | 19 |
| report_artifacts | report_artifacts | 10 |
| report_definitions | report_definitions | 10 |
| report_runs | report_runs | 11 |
| royalties | royalties | 14 |
| status_quo_items | status_quo_items | 12 |
| subscriptions | subscriptions | 7 |
| api_keys | api_keys | 15 |
| tenants | tenants | 35 |
| tenant_users | tenant_users | 8 |
| invitations | invitations | 10 |
| roles | roles | 7 |
| permissions | permissions | 6 |
| role_permissions | role_permissions | 3 |
| user_roles | user_roles | 3 |
| teams | teams | 6 |
| team_members | team_members | 4 |
| tasks | tasks | 17 |
| track_releases | track_releases | 2 |
| tracks | tracks | 16 |
| usage | usage | 7 |
| works | works | 15 |
| works_admin | works_admin | 12 |
| works_admin_documents | works_admin_documents | 12 |
| workspace_templates | workspace_templates | 7 |
| workspace_template_sections | workspace_template_sections | 7 |
| workspace_template_statuses | workspace_template_statuses | 6 |
| workspaces | workspaces | 14 |
| workspace_members | workspace_members | 8 |
| workspace_timeline_events | workspace_timeline_events | 7 |
| workspace_files | workspace_files | 10 |
| workspace_notifications | workspace_notifications | 10 |
| release_playbooks | release_playbooks | 13 |
| playbook_tasks | playbook_tasks | 12 |
| playbook_milestones | playbook_milestones | 10 |
| playbook_deliverables | playbook_deliverables | 10 |
| playbook_approvals | playbook_approvals | 10 |
| workspace_deliverables | workspace_deliverables | 21 |
| workspace_deliverable_dependencies | workspace_deliverable_dependencies | 8 |
| workspace_milestones | workspace_milestones | 15 |
| workspace_approvals | workspace_approvals | 17 |
| workspace_publications | workspace_publications | 16 |
| workspace_videos | workspace_videos | 21 |
| workspace_marketing_phases | workspace_marketing_phases | 14 |
| workspace_marketing_tasks | workspace_marketing_tasks | 15 |
| workspace_discussion_channels | workspace_discussion_channels | 11 |
| workspace_discussion_messages | workspace_discussion_messages | 9 |
| workspace_readiness_scores | workspace_readiness_scores | 13 |
| workspace_template_fields | workspace_template_fields | 12 |
| workspace_dynamic_fields | workspace_dynamic_fields | 8 |
| Attachment | attachments | 17 |

## Models

### User

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| email | String | scalar |
| hashed_password | String | scalar |
| name | String | scalar |
| is_active | Boolean | scalar |
| is_superuser | Boolean | scalar |
| role | String | scalar |
| createdAt | DateTime | scalar |
| updatedAt | DateTime | scalar |
| last_login | DateTime | scalar |
| avatar_url | String | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| tenants | tenants | object |
| department | String | scalar |
| tenant_users | tenant_users | object |
| activities | activities | object |
| admin_backup_artifacts | admin_backup_artifacts | object |
| admin_backup_restore_events | admin_backup_restore_events | object |
| admin_restore_audit | admin_restore_audit | object |
| ai_contract_attach_runs | ai_contract_attach_runs | object |
| ai_contract_documents | ai_contract_documents | object |
| ai_contract_drafts | ai_contract_drafts | object |
| ai_contract_resolution_runs | ai_contract_resolution_runs | object |
| ai_core_write_apply_events | ai_core_write_apply_events | object |
| ai_core_write_proposal_runs | ai_core_write_proposal_runs | object |
| ai_release_integration_runs | ai_release_integration_runs | object |
| ai_royalty_simulation_runs | ai_royalty_simulation_runs | object |
| ai_sessions | ai_sessions | object |
| audit_logs | audit_logs | object |
| contract_intake_release_links | contract_intake_release_links | object |
| documents | documents | object |
| events | events | object |
| jobs | jobs | object |
| notes | notes | object |
| office_documents | office_documents | object |
| office_notes | office_notes | object |
| playlists | playlists | object |
| report_definitions | report_definitions | object |
| report_runs | report_runs | object |
| status_quo_items | status_quo_items | object |
| tasks_tasks_assigned_to_user_idTousers | tasks | object |
| tasks_tasks_created_by_user_idTousers | tasks | object |
| api_keys | api_keys | object |
| user_roles | user_roles | object |
| team_members | team_members | object |
| owned_organizations | tenants | object |
| invited_invitations | invitations | object |
| workspace_members | workspace_members | object |
| workspace_timeline_events | workspace_timeline_events | object |
| workspace_files | workspace_files | object |
| workspace_notifications | workspace_notifications | object |

### activities

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| user_id | Int | scalar |
| action | String | scalar |
| entity_type | String | scalar |
| entity_id | Int | scalar |
| entity_name | String | scalar |
| timestamp | DateTime | scalar |
| users | User | object |

### admin_backup_artifacts

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| created_by | Int | scalar |
| backup_kind | String | scalar |
| filename | String | scalar |
| file_path | String | scalar |
| size_bytes | Int | scalar |
| sha256 | String | scalar |
| is_pre_restore_snapshot | Boolean | scalar |
| source_backup_id | Int | scalar |
| created_at | DateTime | scalar |
| users | User | object |

### admin_backup_restore_events

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| tenant_id | String | scalar |
| backup_id | Int | scalar |
| snapshot_backup_id | Int | scalar |
| initiator_user_id | Int | scalar |
| initiator_org_id | Int | scalar |
| status | String | scalar |
| error | String | scalar |
| duration_ms | Int | scalar |
| created_at | DateTime | scalar |
| users | User | object |

### admin_restore_audit

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| user_id | Int | scalar |
| backup_id | Int | scalar |
| pre_restore_snapshot_id | Int | scalar |
| request_hash | String | scalar |
| result | String | scalar |
| error_hash | String | scalar |
| created_at | DateTime | scalar |
| users | User | object |

### ai_audit_log

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| user_id | Int | scalar |
| action | String | scalar |
| tool | String | scalar |
| request_hash | String | scalar |
| created_at | DateTime | scalar |
| parser_version | String | scalar |

### ai_contract_attach_links

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| run_id | Int | scalar |
| action_type | String | scalar |
| target_name | String | scalar |
| entity_id | Int | scalar |
| confidence | Float | scalar |
| details_json | String | scalar |
| created_at | DateTime | scalar |
| ai_contract_attach_runs | ai_contract_attach_runs | object |

### ai_contract_attach_runs

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| user_id | Int | scalar |
| contract_id | Int | scalar |
| release_id | Int | scalar |
| request_hash | String | scalar |
| warnings_json | String | scalar |
| created_at | DateTime | scalar |
| ai_contract_attach_links | ai_contract_attach_links | object |
| users | User | object |

### ai_contract_documents

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| release_id | Int | scalar |
| file_path | String | scalar |
| file_hash | String | scalar |
| uploaded_by | Int | scalar |
| created_at | DateTime | scalar |
| users | User | object |
| ai_contract_work_links | ai_contract_work_links | object |

### ai_contract_drafts

| Field | Type | Kind |
|-------|------|------|
| id | String | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| created_by | Int | scalar |
| source | String | scalar |
| file_path | String | scalar |
| file_name | String | scalar |
| file_hash | String | scalar |
| size_bytes | Int | scalar |
| extraction_json | String | scalar |
| suggested_defaults_json | String | scalar |
| created_at | DateTime | scalar |
| users | User | object |

### ai_contract_resolution_links

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| tenant_id | String | scalar |
| run_id | Int | scalar |
| entity_type | String | scalar |
| entity_id | Int | scalar |
| action | String | scalar |
| confidence | Int | scalar |
| rationale | String | scalar |
| created_at | DateTime | scalar |
| ai_contract_resolution_runs | ai_contract_resolution_runs | object |

### ai_contract_resolution_runs

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| user_id | Int | scalar |
| contract_hash | String | scalar |
| extractor_version | String | scalar |
| linker_version | String | scalar |
| created_at | DateTime | scalar |
| ai_contract_resolution_links | ai_contract_resolution_links | object |
| users | User | object |
| contract_intake_release_links | contract_intake_release_links | object |

### ai_contract_work_links

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| contract_document_id | Int | scalar |
| work_id | Int | scalar |
| confidence | Float | scalar |
| match_strategy | String | scalar |
| created_at | DateTime | scalar |
| ai_contract_documents | ai_contract_documents | object |

### ai_core_write_apply_events

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| user_id | Int | scalar |
| run_id | Int | scalar |
| request_hash | String | scalar |
| status | String | scalar |
| applied_count | Int | scalar |
| created_count | Int | scalar |
| conflict_count | Int | scalar |
| details_json | String | scalar |
| created_at | DateTime | scalar |
| ai_core_write_proposal_runs | ai_core_write_proposal_runs | object |
| users | User | object |

### ai_core_write_proposal_items

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| run_id | Int | scalar |
| entity_type | String | scalar |
| entity_id | Int | scalar |
| operation | String | scalar |
| patch_json | String | scalar |
| conflicts_json | String | scalar |
| safe_defaults_json | String | scalar |
| requires_user_review | Boolean | scalar |
| created_at | DateTime | scalar |
| ai_core_write_proposal_runs | ai_core_write_proposal_runs | object |

### ai_core_write_proposal_runs

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| user_id | Int | scalar |
| contract_id | Int | scalar |
| release_id | Int | scalar |
| contract_document_id | Int | scalar |
| request_hash | String | scalar |
| parser_version | String | scalar |
| linker_version | String | scalar |
| planner_version | String | scalar |
| created_at | DateTime | scalar |
| ai_core_write_apply_events | ai_core_write_apply_events | object |
| ai_core_write_proposal_items | ai_core_write_proposal_items | object |
| users | User | object |

### ai_messages

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| tenant_id | String | scalar |
| session_id | Int | scalar |
| role | String | scalar |
| content | String | scalar |
| created_at | DateTime | scalar |
| ai_sessions | ai_sessions | object |

### ai_release_integration_links

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| run_id | Int | scalar |
| entity_type | String | scalar |
| entity_id | Int | scalar |
| display_name | String | scalar |
| action | String | scalar |
| confidence | Float | scalar |
| match_strategy | String | scalar |
| rationale | String | scalar |
| created_at | DateTime | scalar |
| ai_release_integration_runs | ai_release_integration_runs | object |

### ai_release_integration_runs

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| user_id | Int | scalar |
| release_id | Int | scalar |
| contract_id | Int | scalar |
| request_hash | String | scalar |
| planner_version | String | scalar |
| created_at | DateTime | scalar |
| ai_release_integration_links | ai_release_integration_links | object |
| users | User | object |

### ai_royalty_simulation_runs

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| user_id | Int | scalar |
| release_id | Int | scalar |
| contract_document_id | Int | scalar |
| request_hash | String | scalar |
| royalty_version | String | scalar |
| splits_total | Float | scalar |
| integrity_total_equals_100 | Boolean | scalar |
| integrity_over_allocated | Boolean | scalar |
| integrity_under_allocated | Boolean | scalar |
| created_at | DateTime | scalar |
| users | User | object |

### ai_sessions

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| user_id | Int | scalar |
| created_at | DateTime | scalar |
| ai_messages | ai_messages | object |
| users | User | object |

### alembic_version

| Field | Type | Kind |
|-------|------|------|
| version_num | String | scalar |

### artist_memberships

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| group_id | Int | scalar |
| member_id | Int | scalar |
| organization_id | Int | scalar |
| role | String | scalar |
| joined_at | DateTime | scalar |
| artists_artist_memberships_group_idToartists | artists | object |
| artists_artist_memberships_member_idToartists | artists | object |

### artists

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| artist_id | String | scalar |
| name | String | scalar |
| aka | String | scalar |
| id_number | String | scalar |
| ipi_number | String | scalar |
| contact_email | String | scalar |
| contact_phone | String | scalar |
| physical_address | String | scalar |
| banking_details | Json | scalar |
| profile_image_url | String | scalar |
| streaming_links | Json | scalar |
| streaming_link | String | scalar |
| social_media | Json | scalar |
| label_id | Int | scalar |
| publisher_id | Int | scalar |
| pro_id | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| nationality | String | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| is_deleted | Boolean | scalar |
| artist_kind | String | scalar |
| legal_name | String | scalar |
| artist_memberships_artist_memberships_group_idToartists | artist_memberships | object |
| artist_memberships_artist_memberships_member_idToartists | artist_memberships | object |
| labels | labels | object |
| pros | pros | object |
| publishers | publishers | object |
| releases | releases | object |
| royalties | royalties | object |

### audit_logs

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| action | String | scalar |
| entity_type | String | scalar |
| entity_id | Int | scalar |
| entity_name | String | scalar |
| changes | Json | scalar |
| user_id | Int | scalar |
| ip_address | String | scalar |
| user_agent | String | scalar |
| created_at | DateTime | scalar |
| entity_uuid | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| users | User | object |

### contract_assets

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| contract_id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| asset_type | String | scalar |
| asset_id | Int | scalar |
| scope_type | String | scalar |
| notes | String | scalar |
| contracts | contracts | object |

### contract_documents

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| contract_id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| file_path | String | scalar |
| file_name | String | scalar |
| version | Int | scalar |
| uploaded_by | Int | scalar |
| uploaded_at | DateTime | scalar |
| checksum | String | scalar |
| mime_type | String | scalar |
| size_bytes | Int | scalar |
| contracts | contracts | object |

### contract_intake_release_links

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| resolution_run_id | Int | scalar |
| release_id | Int | scalar |
| linked_by_user_id | Int | scalar |
| created_at | DateTime | scalar |
| users | User | object |
| releases | releases | object |
| ai_contract_resolution_runs | ai_contract_resolution_runs | object |

### contract_parties

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| contract_id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| entity_type | String | scalar |
| entity_id | Int | scalar |
| external_name | String | scalar |
| role | String | scalar |
| split_percent | Decimal | scalar |
| notes | String | scalar |
| contracts | contracts | object |
| contract_splits | contract_splits | object |

### contract_split_groups

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| contract_id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| group_name | String | scalar |
| group_type | String | scalar |
| notes | String | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| contracts | contracts | object |
| contract_splits | contract_splits | object |

### contract_splits

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| group_id | Int | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| party_id | Int | scalar |
| external_party_name | String | scalar |
| percent | Decimal | scalar |
| notes | String | scalar |
| contract_split_groups | contract_split_groups | object |
| contract_parties | contract_parties | object |

### contract_track_links

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| contract_id | Int | scalar |
| track_id | Int | scalar |
| created_at | DateTime | scalar |
| contracts | contracts | object |
| tracks | tracks | object |

### contracts

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| contract_number | String | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| title | String | scalar |
| status | String | scalar |
| type | String | scalar |
| start_date | DateTime | scalar |
| end_date | DateTime | scalar |
| territory | String | scalar |
| exclusivity | Boolean | scalar |
| royalty_description | String | scalar |
| advances_amount | Decimal | scalar |
| advances_currency | String | scalar |
| recoupment_notes | String | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| created_by | Int | scalar |
| signed_date | DateTime | scalar |
| notes | String | scalar |
| status_quo_override | String | scalar |
| contract_assets | contract_assets | object |
| contract_documents | contract_documents | object |
| contract_parties | contract_parties | object |
| contract_split_groups | contract_split_groups | object |
| contract_track_links | contract_track_links | object |

### documents

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| filename | String | scalar |
| original_filename | String | scalar |
| file_path | String | scalar |
| file_type | String | scalar |
| mime_type | String | scalar |
| file_size | BigInt | scalar |
| version | Int | scalar |
| parent_document_id | Int | scalar |
| title | String | scalar |
| description | String | scalar |
| tags | Json | scalar |
| category | String | scalar |
| related_entity_type | String | scalar |
| related_entity_id | Int | scalar |
| uploaded_by | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| checksum | String | scalar |
| is_deleted | Boolean | scalar |
| documents | documents | object |
| other_documents | documents | object |
| users | User | object |

### events

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| title | String | scalar |
| description | String | scalar |
| start_datetime | DateTime | scalar |
| end_datetime | DateTime | scalar |
| all_day | Boolean | scalar |
| category | String | scalar |
| color | String | scalar |
| location | String | scalar |
| recurrence_rule | String | scalar |
| recurrence_end_date | DateTime | scalar |
| reminder_minutes | Int | scalar |
| related_entity_type | String | scalar |
| related_entity_id | Int | scalar |
| created_by | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| event_type | String | scalar |
| status | String | scalar |
| is_deleted | Boolean | scalar |
| users | User | object |

### individual_organizations

| Field | Type | Kind |
|-------|------|------|
| individual_id | Int | scalar |
| organization_id | Int | scalar |
| individuals | individuals | object |
| organizations | organizations | object |

### individuals

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| first_name | String | scalar |
| last_name | String | scalar |
| email | String | scalar |
| phone | String | scalar |
| role | String | scalar |
| image_url | String | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| relationship_strength | String | scalar |
| organization_id | Int | scalar |
| tenant_id | String | scalar |
| individual_organizations | individual_organizations | object |

### jobs

| Field | Type | Kind |
|-------|------|------|
| id | String | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| user_id | Int | scalar |
| status | String | scalar |
| input | Json | scalar |
| output | Json | scalar |
| error | String | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| users | User | object |

### labels

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| label_id | String | scalar |
| name | String | scalar |
| address | String | scalar |
| contact_email | String | scalar |
| contact_phone | String | scalar |
| website | String | scalar |
| artist_ids | Json | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| logo_url | String | scalar |
| contact_person | String | scalar |
| artists | artists | object |
| releases | releases | object |

### network_relationships

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| relationship_type | String | scalar |
| source_type | String | scalar |
| source_id | Int | scalar |
| target_type | String | scalar |
| target_id | Int | scalar |
| start_date | DateTime | scalar |
| end_date | DateTime | scalar |
| notes | String | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |

### notes

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| title | String | scalar |
| content | String | scalar |
| content_markdown | String | scalar |
| tags | Json | scalar |
| category | String | scalar |
| color | String | scalar |
| pinned | Boolean | scalar |
| attachments | Json | scalar |
| related_entity_type | String | scalar |
| related_entity_id | Int | scalar |
| created_by | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| is_deleted | Boolean | scalar |
| users | User | object |

### office_document_links

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| document_id | Int | scalar |
| entity_type | String | scalar |
| entity_id | Int | scalar |
| office_documents | office_documents | object |

### office_documents

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| doc_type | String | scalar |
| title | String | scalar |
| description | String | scalar |
| storage_path | String | scalar |
| storage_filename | String | scalar |
| original_filename | String | scalar |
| mime_type | String | scalar |
| file_size_bytes | BigInt | scalar |
| checksum | String | scalar |
| uploaded_by_user_id | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| office_document_links | office_document_links | object |
| users | User | object |

### office_note_links

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| note_id | Int | scalar |
| entity_type | String | scalar |
| entity_id | Int | scalar |
| created_at | DateTime | scalar |
| office_notes | office_notes | object |

### office_notes

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| title | String | scalar |
| body | String | scalar |
| tags | String | scalar |
| created_by_user_id | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| office_note_links | office_note_links | object |
| users | User | object |

### organizations

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| name | String | scalar |
| display_name | String | scalar |
| org_type | String | scalar |
| website | String | scalar |
| address | String | scalar |
| logo_url | String | scalar |
| brand_color | String | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| organization_id | Int | scalar |
| individual_organizations | individual_organizations | object |
| releases | releases | object |

### sso_providers

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| provider | String | scalar |
| client_id | String | scalar |
| client_secret | String | scalar |
| issuer_url | String | scalar |
| metadata_url | String | scalar |
| is_active | Boolean | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |

### plans

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| name | String | scalar |
| description | String | scalar |
| price | Decimal | scalar |
| job_limit | Int | scalar |
| max_team_members | Int | scalar |
| max_storage_mb | Int | scalar |
| ai_enabled | Boolean | scalar |
| reports_enabled | Boolean | scalar |
| advanced_contracts | Boolean | scalar |
| stripe_price_id | String | scalar |
| subscriptions | subscriptions | object |

### platforms

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| name | String | scalar |
| platform_type | String | scalar |
| portal_url | String | scalar |
| account_reference | String | scalar |
| territory_coverage | String | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |

### playing_with_neon

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| name | String | scalar |
| value | Float | scalar |

### playlists

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| tenant_id | String | scalar |
| playlist_id | String | scalar |
| name | String | scalar |
| description | String | scalar |
| track_ids | Json | scalar |
| is_public | Boolean | scalar |
| share_link | String | scalar |
| play_count | Int | scalar |
| created_by | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| users | User | object |

### pros

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| pro_id | String | scalar |
| name | String | scalar |
| address | String | scalar |
| contact_email | String | scalar |
| contact_phone | String | scalar |
| website | String | scalar |
| territory | String | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| artists | artists | object |
| works | works | object |

### publishers

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| publisher_id | String | scalar |
| name | String | scalar |
| address | String | scalar |
| contact_email | String | scalar |
| contact_phone | String | scalar |
| rights_type | String | scalar |
| artist_ids | Json | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| contact_person | String | scalar |
| artists | artists | object |
| works | works | object |

### releases

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| release_id | String | scalar |
| title | String | scalar |
| upc_code | String | scalar |
| release_date | DateTime | scalar |
| release_type | String | scalar |
| cover_art_url | String | scalar |
| streaming_link | String | scalar |
| label_id | Int | scalar |
| artist_id | Int | scalar |
| distributor_id | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| catalog_number | String | scalar |
| artist_ids | Json | scalar |
| credits | Json | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| is_deleted | Boolean | scalar |
| contract_intake_release_links | contract_intake_release_links | object |
| organizations | organizations | object |
| artists | artists | object |
| labels | labels | object |
| track_releases | track_releases | object |
| tracks | tracks | object |

### report_artifacts

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| report_run_id | Int | scalar |
| format | String | scalar |
| storage_path | String | scalar |
| filename | String | scalar |
| mime_type | String | scalar |
| file_size_bytes | Int | scalar |
| created_at | DateTime | scalar |
| report_runs | report_runs | object |

### report_definitions

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| name | String | scalar |
| description | String | scalar |
| report_type | String | scalar |
| config_json | String | scalar |
| created_by_user_id | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| users | User | object |
| report_runs | report_runs | object |

### report_runs

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| report_definition_id | Int | scalar |
| status | String | scalar |
| requested_by_user_id | Int | scalar |
| parameters_json | String | scalar |
| row_count | Int | scalar |
| error | String | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| report_artifacts | report_artifacts | object |
| report_definitions | report_definitions | object |
| users | User | object |

### royalties

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| tenant_id | String | scalar |
| royalty_id | String | scalar |
| artist_id | Int | scalar |
| work_id | Int | scalar |
| track_id | Int | scalar |
| source | String | scalar |
| amount | Decimal | scalar |
| currency | String | scalar |
| statement_date | DateTime | scalar |
| fees | Decimal | scalar |
| advances | Decimal | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| artists | artists | object |
| tracks | tracks | object |
| works | works | object |

### status_quo_items

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| entity_type | String | scalar |
| entity_id | Int | scalar |
| issue_type | String | scalar |
| severity | String | scalar |
| summary | String | scalar |
| details_json | String | scalar |
| created_at | DateTime | scalar |
| resolved_at | DateTime | scalar |
| resolved_by_user_id | Int | scalar |
| users | User | object |

### subscriptions

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| plan_id | Int | scalar |
| status | String | scalar |
| current_period_start | DateTime | scalar |
| current_period_end | DateTime | scalar |
| plans | plans | object |
| tenants | tenants | object |

### api_keys

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| name | String | scalar |
| prefix | String | scalar |
| key_hash | String | scalar |
| key_last_four | String | scalar |
| scopes | String | scalar |
| rate_limit | Int | scalar |
| last_used_at | DateTime | scalar |
| expires_at | DateTime | scalar |
| is_active | Boolean | scalar |
| created_by | Int | scalar |
| created_at | DateTime | scalar |
| revoked_at | DateTime | scalar |
| users | User | object |

### tenants

| Field | Type | Kind |
|-------|------|------|
| id | String | scalar |
| name | String | scalar |
| display_name | String | scalar |
| legal_name | String | scalar |
| org_type | String | scalar |
| logo_url | String | scalar |
| banner_url | String | scalar |
| brand_color | String | scalar |
| secondary_color | String | scalar |
| accent_color | String | scalar |
| email_signature | String | scalar |
| report_branding | Json | scalar |
| pdf_branding | Json | scalar |
| invoice_branding | Json | scalar |
| website | String | scalar |
| email | String | scalar |
| phone | String | scalar |
| physical_address | String | scalar |
| country | String | scalar |
| province_state | String | scalar |
| city | String | scalar |
| currency | String | scalar |
| timezone | String | scalar |
| tax_number | String | scalar |
| registration_number | String | scalar |
| subscription_plan | String | scalar |
| ai_model | String | scalar |
| ai_prompt_library | Json | scalar |
| ai_knowledge_base | Json | scalar |
| ai_allowed_agents | Json | scalar |
| ai_monthly_budget | Decimal | scalar |
| owner_id | Int | scalar |
| is_active | Boolean | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| owner | User | object |
| users | User | object |
| tenant_users | tenant_users | object |
| invitations | invitations | object |
| roles | roles | object |
| teams | teams | object |
| subscriptions | subscriptions | object |

### tenant_users

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| tenant_id | String | scalar |
| user_id | Int | scalar |
| role_id | Int | scalar |
| is_default | Boolean | scalar |
| invited_at | DateTime | scalar |
| accepted_at | DateTime | scalar |
| invited_by | Int | scalar |
| tenants | tenants | object |
| users | User | object |

### invitations

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| tenant_id | String | scalar |
| email | String | scalar |
| invited_by | Int | scalar |
| invited_by_user | User | object |
| token | String | scalar |
| role_id | Int | scalar |
| message | String | scalar |
| expires_at | DateTime | scalar |
| accepted_at | DateTime | scalar |
| created_at | DateTime | scalar |
| tenants | tenants | object |

### roles

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| name | String | scalar |
| description | String | scalar |
| is_system | Boolean | scalar |
| organization_id | String | scalar |
| tenants | tenants | object |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| role_permissions | role_permissions | object |
| user_roles | user_roles | object |

### permissions

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| code | String | scalar |
| name | String | scalar |
| description | String | scalar |
| module | String | scalar |
| created_at | DateTime | scalar |
| role_permissions | role_permissions | object |

### role_permissions

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| role_id | Int | scalar |
| permission_id | Int | scalar |
| roles | roles | object |
| permissions | permissions | object |

### user_roles

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| user_id | Int | scalar |
| role_id | Int | scalar |
| roles | roles | object |
| users | User | object |

### teams

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| name | String | scalar |
| description | String | scalar |
| organization_id | String | scalar |
| tenants | tenants | object |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| team_members | team_members | object |

### team_members

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| team_id | Int | scalar |
| user_id | Int | scalar |
| role | String | scalar |
| teams | teams | object |
| users | User | object |

### tasks

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| title | String | scalar |
| description | String | scalar |
| status | String | scalar |
| priority | String | scalar |
| due_date | DateTime | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| assigned_to_user_id | Int | scalar |
| created_by_user_id | Int | scalar |
| linked_entity_type | String | scalar |
| linked_entity_id | Int | scalar |
| is_deleted | Boolean | scalar |
| source_type | String | scalar |
| source_id | Int | scalar |
| users_tasks_assigned_to_user_idTousers | User | object |
| users_tasks_created_by_user_idTousers | User | object |

### track_releases

| Field | Type | Kind |
|-------|------|------|
| track_id | Int | scalar |
| release_id | Int | scalar |
| releases | releases | object |
| tracks | tracks | object |

### tracks

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| tenant_id | String | scalar |
| track_id | String | scalar |
| title | String | scalar |
| duration | DateTime | scalar |
| genre | String | scalar |
| release_date | DateTime | scalar |
| isrc_code | String | scalar |
| streaming_link | String | scalar |
| artist_ids | Json | scalar |
| file_location | String | scalar |
| release_id | Int | scalar |
| work_id | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| credits | Json | scalar |
| contract_track_links | contract_track_links | object |
| royalties | royalties | object |
| track_releases | track_releases | object |
| releases | releases | object |
| works | works | object |

### usage

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| metric | String | scalar |
| value | Int | scalar |
| tokens_used | BigInt | scalar |
| period | String | scalar |

### works

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| work_id | String | scalar |
| title | String | scalar |
| iswc_code | String | scalar |
| composers | Json | scalar |
| composers_text | String | scalar |
| arrangers | Json | scalar |
| arrangers_text | String | scalar |
| publisher_id | Int | scalar |
| pro_id | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| is_deleted | Boolean | scalar |
| royalties | royalties | object |
| tracks | tracks | object |
| pros | pros | object |
| publishers | publishers | object |
| works_admin | works_admin | object |

### works_admin

| Field | Type | Kind |
|-------|------|------|
| id | String | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| work_id | Int | scalar |
| registration_status | String | scalar |
| registered_with | String | scalar |
| registration_date | DateTime | scalar |
| registration_reference | String | scalar |
| notes | String | scalar |
| created_by | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| works | works | object |
| works_admin_documents | works_admin_documents | object |

### works_admin_documents

| Field | Type | Kind |
|-------|------|------|
| id | String | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| works_admin_id | String | scalar |
| doc_type | String | scalar |
| file_path | String | scalar |
| file_name | String | scalar |
| mime_type | String | scalar |
| size_bytes | Int | scalar |
| checksum | String | scalar |
| uploaded_by | Int | scalar |
| uploaded_at | DateTime | scalar |
| works_admin | works_admin | object |

### workspace_templates

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| name | String | scalar |
| slug | String | scalar |
| description | String | scalar |
| icon | String | scalar |
| color | String | scalar |
| created_at | DateTime | scalar |
| sections | workspace_template_sections | object |
| statuses | workspace_template_statuses | object |
| fields | workspace_template_fields | object |
| workspaces | workspaces | object |

### workspace_template_sections

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| template_id | Int | scalar |
| name | String | scalar |
| slug | String | scalar |
| description | String | scalar |
| icon | String | scalar |
| sort_order | Int | scalar |
| template | workspace_templates | object |

### workspace_template_statuses

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| template_id | Int | scalar |
| name | String | scalar |
| slug | String | scalar |
| sort_order | Int | scalar |
| color | String | scalar |
| template | workspace_templates | object |

### workspaces

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| name | String | scalar |
| description | String | scalar |
| template_id | Int | scalar |
| release_id | Int | scalar |
| status | String | scalar |
| cover_image_url | String | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| created_by | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| archived_at | DateTime | scalar |
| is_deleted | Boolean | scalar |
| template | workspace_templates | object |
| members | workspace_members | object |
| timeline_events | workspace_timeline_events | object |
| files | workspace_files | object |
| notifications | workspace_notifications | object |
| deliverables | workspace_deliverables | object |
| milestones | workspace_milestones | object |
| approvals | workspace_approvals | object |
| publications | workspace_publications | object |
| videos | workspace_videos | object |
| marketing_phases | workspace_marketing_phases | object |
| discussion_channels | workspace_discussion_channels | object |
| readiness_scores | workspace_readiness_scores | object |
| dependencies | workspace_deliverable_dependencies | object |
| dynamic_fields | workspace_dynamic_fields | object |

### workspace_members

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| workspace_id | Int | scalar |
| user_id | Int | scalar |
| name | String | scalar |
| email | String | scalar |
| role | String | scalar |
| invited_at | DateTime | scalar |
| accepted_at | DateTime | scalar |
| workspace | workspaces | object |
| user | User | object |

### workspace_timeline_events

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| workspace_id | Int | scalar |
| user_id | Int | scalar |
| event_type | String | scalar |
| summary | String | scalar |
| details | String | scalar |
| created_at | DateTime | scalar |
| workspace | workspaces | object |
| user | User | object |

### workspace_files

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| workspace_id | Int | scalar |
| category | String | scalar |
| filename | String | scalar |
| original_name | String | scalar |
| file_path | String | scalar |
| mime_type | String | scalar |
| file_size | Int | scalar |
| uploaded_by | Int | scalar |
| created_at | DateTime | scalar |
| workspace | workspaces | object |
| user | User | object |

### workspace_notifications

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| workspace_id | Int | scalar |
| organization_id | String | scalar |
| user_id | Int | scalar |
| type | String | scalar |
| title | String | scalar |
| message | String | scalar |
| is_read | Boolean | scalar |
| link | String | scalar |
| created_at | DateTime | scalar |
| workspace | workspaces | object |
| user | User | object |

### release_playbooks

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| name | String | scalar |
| slug | String | scalar |
| description | String | scalar |
| release_type | String | scalar |
| icon | String | scalar |
| color | String | scalar |
| is_built_in | Boolean | scalar |
| created_by | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| playbook_tasks | playbook_tasks | object |
| playbook_milestones | playbook_milestones | object |
| playbook_deliverables | playbook_deliverables | object |
| playbook_approvals | playbook_approvals | object |

### playbook_tasks

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| playbook_id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| title | String | scalar |
| description | String | scalar |
| section | String | scalar |
| department | String | scalar |
| priority | String | scalar |
| sort_order | Int | scalar |
| days_before_release | Int | scalar |
| created_at | DateTime | scalar |
| playbook | release_playbooks | object |

### playbook_milestones

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| playbook_id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| name | String | scalar |
| description | String | scalar |
| section | String | scalar |
| sort_order | Int | scalar |
| days_before_release | Int | scalar |
| created_at | DateTime | scalar |
| playbook | release_playbooks | object |

### playbook_deliverables

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| playbook_id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| name | String | scalar |
| description | String | scalar |
| deliverable_type | String | scalar |
| sort_order | Int | scalar |
| days_before_release | Int | scalar |
| created_at | DateTime | scalar |
| playbook | release_playbooks | object |

### playbook_approvals

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| playbook_id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| name | String | scalar |
| description | String | scalar |
| item_type | String | scalar |
| sort_order | Int | scalar |
| days_before_release | Int | scalar |
| created_at | DateTime | scalar |
| playbook | release_playbooks | object |

### workspace_deliverables

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| workspace_id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| name | String | scalar |
| description | String | scalar |
| deliverable_type | String | scalar |
| status | String | scalar |
| priority | String | scalar |
| due_date | DateTime | scalar |
| assigned_to | Int | scalar |
| approved_by | Int | scalar |
| approved_at | DateTime | scalar |
| version | Int | scalar |
| file_path | String | scalar |
| notes | String | scalar |
| sort_order | Int | scalar |
| is_deleted | Boolean | scalar |
| created_by | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| workspace | workspaces | object |
| dependencies_as_source | workspace_deliverable_dependencies | object |
| dependencies_as_target | workspace_deliverable_dependencies | object |

### workspace_deliverable_dependencies

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| workspace_id | Int | scalar |
| organization_id | String | scalar |
| source_id | Int | scalar |
| target_id | Int | scalar |
| dependency_type | String | scalar |
| created_by | Int | scalar |
| created_at | DateTime | scalar |
| source | workspace_deliverables | object |
| target | workspace_deliverables | object |
| workspace | workspaces | object |

### workspace_milestones

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| workspace_id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| name | String | scalar |
| description | String | scalar |
| section | String | scalar |
| due_date | DateTime | scalar |
| completed_at | DateTime | scalar |
| status | String | scalar |
| sort_order | Int | scalar |
| is_deleted | Boolean | scalar |
| created_by | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| workspace | workspaces | object |

### workspace_approvals

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| workspace_id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| name | String | scalar |
| description | String | scalar |
| item_type | String | scalar |
| item_id | Int | scalar |
| status | String | scalar |
| requested_by | Int | scalar |
| approved_by | Int | scalar |
| approved_at | DateTime | scalar |
| comments | String | scalar |
| due_date | DateTime | scalar |
| is_deleted | Boolean | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| workspace | workspaces | object |

### workspace_publications

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| workspace_id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| platform | String | scalar |
| content_type | String | scalar |
| title | String | scalar |
| content | String | scalar |
| status | String | scalar |
| scheduled_at | DateTime | scalar |
| published_at | DateTime | scalar |
| url | String | scalar |
| created_by | Int | scalar |
| is_deleted | Boolean | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| workspace | workspaces | object |

### workspace_videos

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| workspace_id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| title | String | scalar |
| video_type | String | scalar |
| description | String | scalar |
| status | String | scalar |
| due_date | DateTime | scalar |
| editor_id | Int | scalar |
| script | String | scalar |
| file_path | String | scalar |
| url | String | scalar |
| duration_seconds | Int | scalar |
| approved | Boolean | scalar |
| approved_by | Int | scalar |
| approved_at | DateTime | scalar |
| is_deleted | Boolean | scalar |
| created_by | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| workspace | workspaces | object |

### workspace_marketing_phases

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| workspace_id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| name | String | scalar |
| slug | String | scalar |
| description | String | scalar |
| start_date | DateTime | scalar |
| end_date | DateTime | scalar |
| sort_order | Int | scalar |
| is_deleted | Boolean | scalar |
| created_by | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| workspace | workspaces | object |
| tasks | workspace_marketing_tasks | object |

### workspace_marketing_tasks

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| phase_id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| title | String | scalar |
| description | String | scalar |
| status | String | scalar |
| priority | String | scalar |
| assigned_to | Int | scalar |
| due_date | DateTime | scalar |
| sort_order | Int | scalar |
| is_deleted | Boolean | scalar |
| created_by | Int | scalar |
| created_at | DateTime | scalar |
| updated_at | DateTime | scalar |
| phase | workspace_marketing_phases | object |

### workspace_discussion_channels

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| workspace_id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| name | String | scalar |
| slug | String | scalar |
| description | String | scalar |
| sort_order | Int | scalar |
| is_deleted | Boolean | scalar |
| created_by | Int | scalar |
| created_at | DateTime | scalar |
| workspace | workspaces | object |
| messages | workspace_discussion_messages | object |

### workspace_discussion_messages

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| channel_id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| content | String | scalar |
| user_id | Int | scalar |
| edited_at | DateTime | scalar |
| is_deleted | Boolean | scalar |
| created_at | DateTime | scalar |
| channel | workspace_discussion_channels | object |

### workspace_readiness_scores

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| workspace_id | Int | scalar |
| organization_id | String | scalar |
| tenant_id | String | scalar |
| overall_score | Float | scalar |
| metadata_score | Float | scalar |
| artwork_score | Float | scalar |
| marketing_score | Float | scalar |
| distribution_score | Float | scalar |
| approvals_score | Float | scalar |
| videos_score | Float | scalar |
| breakdown_json | String | scalar |
| calculated_at | DateTime | scalar |
| workspace | workspaces | object |

### workspace_template_fields

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| template_id | Int | scalar |
| section_slug | String | scalar |
| field_key | String | scalar |
| label | String | scalar |
| field_type | String | scalar |
| options | String | scalar |
| is_required | Boolean | scalar |
| placeholder | String | scalar |
| sort_order | Int | scalar |
| default_value | String | scalar |
| created_at | DateTime | scalar |
| template | workspace_templates | object |

### workspace_dynamic_fields

| Field | Type | Kind |
|-------|------|------|
| id | Int | scalar |
| workspace_id | Int | scalar |
| organization_id | String | scalar |
| template_field_id | Int | scalar |
| field_key | String | scalar |
| field_value | String | scalar |
| updated_by | Int | scalar |
| updated_at | DateTime | scalar |
| workspace | workspaces | object |

### Attachment

| Field | Type | Kind |
|-------|------|------|
| id | String | scalar |
| organizationId | String | scalar |
| workspaceId | String | scalar |
| entityType | String | scalar |
| entityId | String | scalar |
| fileName | String | scalar |
| originalName | String | scalar |
| mimeType | String | scalar |
| category | String | scalar |
| fileSize | Int | scalar |
| bucket | String | scalar |
| storageKey | String | scalar |
| checksum | String | scalar |
| version | Int | scalar |
| uploadedBy | String | scalar |
| createdAt | DateTime | scalar |
| updatedAt | DateTime | scalar |

