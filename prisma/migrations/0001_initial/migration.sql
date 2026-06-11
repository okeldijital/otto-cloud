-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "hashed_password" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255),
    "is_active" BOOLEAN,
    "is_superuser" BOOLEAN,
    "role" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "last_login" TIMESTAMPTZ(6),
    "avatar_url" VARCHAR(500),
    "organization_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" VARCHAR NOT NULL,
    "entity_type" VARCHAR NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "entity_name" VARCHAR,
    "timestamp" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_backup_artifacts" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "backup_kind" VARCHAR(32) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(1000) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "is_pre_restore_snapshot" BOOLEAN NOT NULL DEFAULT false,
    "source_backup_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_backup_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_backup_restore_events" (
    "id" SERIAL NOT NULL,
    "backup_id" INTEGER NOT NULL,
    "snapshot_backup_id" INTEGER,
    "initiator_user_id" INTEGER NOT NULL,
    "initiator_org_id" INTEGER NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "error" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_backup_restore_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_restore_audit" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "backup_id" INTEGER NOT NULL,
    "pre_restore_snapshot_id" INTEGER,
    "request_hash" VARCHAR(64) NOT NULL,
    "result" VARCHAR(16) NOT NULL,
    "error_hash" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_restore_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_audit_log" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "tool" VARCHAR(50),
    "request_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "parser_version" VARCHAR(20),

    CONSTRAINT "ai_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_contract_attach_links" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "run_id" INTEGER NOT NULL,
    "action_type" VARCHAR(64) NOT NULL,
    "target_name" VARCHAR(255),
    "entity_id" INTEGER,
    "confidence" DOUBLE PRECISION NOT NULL,
    "details_json" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_contract_attach_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_contract_attach_runs" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "release_id" INTEGER NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "warnings_json" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_contract_attach_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_contract_documents" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "release_id" INTEGER NOT NULL,
    "file_path" VARCHAR(1000) NOT NULL,
    "file_hash" VARCHAR(64) NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_contract_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_contract_drafts" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" UUID NOT NULL,
    "created_by" INTEGER NOT NULL,
    "source" VARCHAR(32),
    "file_path" VARCHAR(1000) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_hash" VARCHAR(64) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "extraction_json" TEXT NOT NULL,
    "suggested_defaults_json" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_contract_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_contract_resolution_links" (
    "id" SERIAL NOT NULL,
    "run_id" INTEGER NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER,
    "action" VARCHAR(20) NOT NULL,
    "confidence" INTEGER,
    "rationale" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_contract_resolution_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_contract_resolution_runs" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "contract_hash" VARCHAR(64) NOT NULL,
    "extractor_version" VARCHAR(50),
    "linker_version" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_contract_resolution_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_contract_work_links" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "contract_document_id" INTEGER NOT NULL,
    "work_id" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "match_strategy" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_contract_work_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core_write_apply_events" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "run_id" INTEGER NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "applied_count" INTEGER NOT NULL DEFAULT 0,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "conflict_count" INTEGER NOT NULL DEFAULT 0,
    "details_json" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_core_write_apply_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core_write_proposal_items" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "run_id" INTEGER NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" INTEGER,
    "operation" VARCHAR(16) NOT NULL,
    "patch_json" TEXT NOT NULL,
    "conflicts_json" TEXT,
    "safe_defaults_json" TEXT,
    "requires_user_review" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_core_write_proposal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core_write_proposal_runs" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "release_id" INTEGER,
    "contract_document_id" INTEGER,
    "request_hash" VARCHAR(64) NOT NULL,
    "parser_version" VARCHAR(64),
    "linker_version" VARCHAR(64),
    "planner_version" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_core_write_proposal_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_release_integration_links" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "run_id" INTEGER NOT NULL,
    "entity_type" VARCHAR(32) NOT NULL,
    "entity_id" INTEGER,
    "display_name" VARCHAR(255) NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "confidence" DOUBLE PRECISION,
    "match_strategy" VARCHAR(20) NOT NULL,
    "rationale" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_release_integration_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_release_integration_runs" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "release_id" INTEGER NOT NULL,
    "contract_id" INTEGER,
    "request_hash" VARCHAR(64) NOT NULL,
    "planner_version" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_release_integration_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_royalty_simulation_runs" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "release_id" INTEGER NOT NULL,
    "contract_document_id" INTEGER,
    "request_hash" VARCHAR(64) NOT NULL,
    "royalty_version" VARCHAR(50) NOT NULL,
    "splits_total" DOUBLE PRECISION NOT NULL,
    "integrity_total_equals_100" BOOLEAN NOT NULL,
    "integrity_over_allocated" BOOLEAN NOT NULL,
    "integrity_under_allocated" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_royalty_simulation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_sessions" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alembic_version" (
    "version_num" VARCHAR(32) NOT NULL,

    CONSTRAINT "alembic_version_pkc" PRIMARY KEY ("version_num")
);

-- CreateTable
CREATE TABLE "artist_memberships" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "organization_id" INTEGER,
    "role" VARCHAR(100),
    "joined_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artists" (
    "id" SERIAL NOT NULL,
    "artist_id" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "aka" VARCHAR(255),
    "id_number" VARCHAR(100),
    "ipi_number" VARCHAR(50),
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(50),
    "physical_address" TEXT,
    "banking_details" JSON,
    "profile_image_url" VARCHAR(500),
    "streaming_links" JSON,
    "streaming_link" VARCHAR(500),
    "social_media" JSON,
    "label_id" INTEGER,
    "publisher_id" INTEGER,
    "pro_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "nationality" VARCHAR(100),
    "organization_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "artist_kind" VARCHAR(20) NOT NULL DEFAULT 'solo',
    "legal_name" VARCHAR(255),

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "action" VARCHAR(50),
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "entity_name" VARCHAR(255),
    "changes" JSON,
    "user_id" INTEGER,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "entity_uuid" INTEGER,
    "organization_id" INTEGER,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_assets" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "asset_type" VARCHAR(50) NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "scope_type" VARCHAR(50),
    "notes" TEXT,

    CONSTRAINT "contract_assets_v1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_documents" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "version" INTEGER NOT NULL,
    "uploaded_by" INTEGER,
    "uploaded_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "checksum" VARCHAR(64),
    "mime_type" VARCHAR(100) DEFAULT 'application/pdf',
    "size_bytes" INTEGER,

    CONSTRAINT "contract_documents_v1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_intake_release_links" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "resolution_run_id" INTEGER NOT NULL,
    "release_id" INTEGER NOT NULL,
    "linked_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_intake_release_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_parties" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER,
    "external_name" VARCHAR(255),
    "role" VARCHAR(100) NOT NULL,
    "split_percent" DECIMAL(6,3),
    "notes" TEXT,

    CONSTRAINT "contract_parties_v1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_split_groups" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "group_name" VARCHAR(100) NOT NULL,
    "group_type" VARCHAR(50),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "contract_split_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_splits" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "party_id" INTEGER,
    "external_party_name" VARCHAR(255),
    "percent" DECIMAL(6,3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "contract_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_track_links" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "track_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_track_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" SERIAL NOT NULL,
    "contract_number" VARCHAR(50) NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "type" VARCHAR(50),
    "start_date" DATE,
    "end_date" DATE,
    "territory" VARCHAR(255),
    "exclusivity" BOOLEAN,
    "royalty_description" TEXT,
    "advances_amount" DECIMAL(10,2),
    "advances_currency" VARCHAR(3),
    "recoupment_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "signed_date" DATE,
    "notes" TEXT,
    "status_quo_override" VARCHAR(50),

    CONSTRAINT "contracts_v1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_type" VARCHAR(50),
    "mime_type" VARCHAR(100),
    "file_size" BIGINT,
    "version" INTEGER,
    "parent_document_id" INTEGER,
    "title" VARCHAR(255),
    "description" TEXT,
    "tags" JSON,
    "category" VARCHAR(100),
    "related_entity_type" VARCHAR(50),
    "related_entity_id" INTEGER,
    "uploaded_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "organization_id" UUID NOT NULL,
    "checksum" VARCHAR(64),
    "is_deleted" BOOLEAN NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "start_datetime" TIMESTAMPTZ(6) NOT NULL,
    "end_datetime" TIMESTAMPTZ(6),
    "all_day" BOOLEAN,
    "category" VARCHAR(100),
    "color" VARCHAR(20),
    "location" VARCHAR(255),
    "recurrence_rule" VARCHAR(500),
    "recurrence_end_date" TIMESTAMPTZ(6),
    "reminder_minutes" INTEGER,
    "related_entity_type" VARCHAR(50),
    "related_entity_id" INTEGER,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "organization_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    "event_type" VARCHAR(100) DEFAULT 'Other',
    "status" VARCHAR(50) DEFAULT 'Planned',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "individual_organizations" (
    "individual_id" INTEGER NOT NULL,
    "organization_id" INTEGER NOT NULL,

    CONSTRAINT "individual_organizations_pkey" PRIMARY KEY ("individual_id","organization_id")
);

-- CreateTable
CREATE TABLE "individuals" (
    "id" SERIAL NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "role" VARCHAR(100),
    "image_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "relationship_strength" VARCHAR(50) DEFAULT 'Regular',
    "organization_id" INTEGER NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "input" JSON NOT NULL,
    "output" JSON,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labels" (
    "id" SERIAL NOT NULL,
    "label_id" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(50),
    "website" VARCHAR(255),
    "artist_ids" JSON,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "logo_url" VARCHAR(255),
    "contact_person" VARCHAR(255),

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_relationships" (
    "id" SERIAL NOT NULL,
    "relationship_type" VARCHAR(100),
    "source_type" VARCHAR(50),
    "source_id" INTEGER,
    "target_type" VARCHAR(50),
    "target_id" INTEGER,
    "start_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "network_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "content_markdown" TEXT,
    "tags" JSON,
    "category" VARCHAR(100),
    "color" VARCHAR(20),
    "pinned" BOOLEAN,
    "attachments" JSON,
    "related_entity_type" VARCHAR(50),
    "related_entity_id" INTEGER,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "organization_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_document_links" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "document_id" INTEGER NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER NOT NULL,

    CONSTRAINT "office_document_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_documents" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "doc_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255),
    "description" TEXT,
    "storage_path" VARCHAR(500) NOT NULL,
    "storage_filename" VARCHAR(255) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100),
    "file_size_bytes" BIGINT NOT NULL,
    "checksum" VARCHAR(64),
    "uploaded_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "office_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_note_links" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "note_id" INTEGER NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "office_note_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_notes" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "title" VARCHAR(255),
    "body" TEXT NOT NULL,
    "tags" VARCHAR(255),
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "office_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "org_type" VARCHAR(100),
    "website" VARCHAR(255),
    "address" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "organization_id" INTEGER NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "job_limit" INTEGER NOT NULL,
    "price" DECIMAL(10,2),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platforms" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "platform_type" VARCHAR(100),
    "portal_url" VARCHAR(255),
    "account_reference" VARCHAR(255),
    "territory_coverage" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playing_with_neon" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "value" REAL,

    CONSTRAINT "playing_with_neon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlists" (
    "id" SERIAL NOT NULL,
    "playlist_id" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "track_ids" JSON,
    "is_public" BOOLEAN,
    "share_link" VARCHAR(255),
    "play_count" INTEGER,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pros" (
    "id" SERIAL NOT NULL,
    "pro_id" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(50),
    "website" VARCHAR(255),
    "territory" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "pros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishers" (
    "id" SERIAL NOT NULL,
    "publisher_id" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(50),
    "rights_type" VARCHAR(100),
    "artist_ids" JSON,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "contact_person" VARCHAR(255),

    CONSTRAINT "publishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "releases" (
    "id" SERIAL NOT NULL,
    "release_id" VARCHAR(50),
    "title" VARCHAR(255) NOT NULL,
    "upc_code" VARCHAR(50),
    "release_date" DATE,
    "release_type" VARCHAR(50),
    "cover_art_url" VARCHAR(500),
    "streaming_link" VARCHAR(500),
    "label_id" INTEGER,
    "artist_id" INTEGER,
    "distributor_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "catalog_number" VARCHAR(50),
    "artist_ids" JSON,
    "credits" JSON,
    "organization_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_artifacts" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "report_run_id" INTEGER NOT NULL,
    "format" VARCHAR(10) NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_definitions" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "report_type" VARCHAR(100) NOT NULL,
    "config_json" TEXT NOT NULL,
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_runs" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "report_definition_id" INTEGER,
    "status" VARCHAR(50) NOT NULL,
    "requested_by_user_id" INTEGER NOT NULL,
    "parameters_json" TEXT NOT NULL,
    "row_count" INTEGER,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "royalties" (
    "id" SERIAL NOT NULL,
    "royalty_id" VARCHAR(50),
    "artist_id" INTEGER,
    "work_id" INTEGER,
    "track_id" INTEGER,
    "source" VARCHAR(100),
    "amount" DECIMAL(15,2),
    "currency" VARCHAR(3),
    "statement_date" DATE,
    "fees" DECIMAL(15,2),
    "advances" DECIMAL(15,2),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "royalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_quo_items" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "issue_type" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "summary" VARCHAR(255) NOT NULL,
    "details_json" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by_user_id" INTEGER,

    CONSTRAINT "status_quo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "current_period_start" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR,
    "description" TEXT,
    "status" VARCHAR,
    "priority" VARCHAR,
    "due_date" TIMESTAMP(6),
    "created_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6),
    "organization_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    "assigned_to_user_id" INTEGER,
    "created_by_user_id" INTEGER NOT NULL DEFAULT 1,
    "linked_entity_type" VARCHAR(50),
    "linked_entity_id" INTEGER,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "source_type" VARCHAR(50),
    "source_id" INTEGER,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track_releases" (
    "track_id" INTEGER NOT NULL,
    "release_id" INTEGER NOT NULL,

    CONSTRAINT "track_releases_pkey" PRIMARY KEY ("track_id","release_id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" SERIAL NOT NULL,
    "track_id" VARCHAR(50),
    "title" VARCHAR(255) NOT NULL,
    "duration" TIME(6),
    "genre" VARCHAR(100),
    "release_date" DATE,
    "isrc_code" VARCHAR(50),
    "streaming_link" VARCHAR(500),
    "artist_ids" JSON,
    "file_location" VARCHAR(500),
    "release_id" INTEGER,
    "work_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "credits" JSON,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "metric" VARCHAR(50) NOT NULL,
    "value" INTEGER NOT NULL,
    "tokens_used" BIGINT NOT NULL,
    "period" VARCHAR(10) NOT NULL,

    CONSTRAINT "usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "works" (
    "id" SERIAL NOT NULL,
    "work_id" VARCHAR(50),
    "title" VARCHAR(255) NOT NULL,
    "iswc_code" VARCHAR(50),
    "composers" JSON,
    "composers_text" TEXT,
    "arrangers" JSON,
    "arrangers_text" TEXT,
    "publisher_id" INTEGER,
    "pro_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "organization_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "works_admin" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "work_id" INTEGER NOT NULL,
    "registration_status" VARCHAR(50) NOT NULL DEFAULT 'Unknown',
    "registered_with" VARCHAR(255),
    "registration_date" DATE,
    "registration_reference" VARCHAR(255),
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "works_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "works_admin_documents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "works_admin_id" UUID NOT NULL,
    "doc_type" VARCHAR(100) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) DEFAULT 'application/pdf',
    "size_bytes" INTEGER,
    "checksum" VARCHAR(64),
    "uploaded_by" INTEGER,
    "uploaded_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "works_admin_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ix_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "ix_users_id" ON "users"("id");

-- CreateIndex
CREATE INDEX "ix_users_organization_id" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "ix_activities_id" ON "activities"("id");

-- CreateIndex
CREATE INDEX "ix_admin_backup_artifacts_backup_kind" ON "admin_backup_artifacts"("backup_kind");

-- CreateIndex
CREATE INDEX "ix_admin_backup_artifacts_created_at" ON "admin_backup_artifacts"("created_at");

-- CreateIndex
CREATE INDEX "ix_admin_backup_artifacts_created_by" ON "admin_backup_artifacts"("created_by");

-- CreateIndex
CREATE INDEX "ix_admin_backup_artifacts_id" ON "admin_backup_artifacts"("id");

-- CreateIndex
CREATE INDEX "ix_admin_backup_artifacts_is_pre_restore_snapshot" ON "admin_backup_artifacts"("is_pre_restore_snapshot");

-- CreateIndex
CREATE INDEX "ix_admin_backup_artifacts_organization_id" ON "admin_backup_artifacts"("organization_id");

-- CreateIndex
CREATE INDEX "ix_admin_backup_artifacts_sha256" ON "admin_backup_artifacts"("sha256");

-- CreateIndex
CREATE INDEX "ix_admin_backup_artifacts_source_backup_id" ON "admin_backup_artifacts"("source_backup_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_admin_backup_artifact_org_sha256" ON "admin_backup_artifacts"("organization_id", "sha256");

-- CreateIndex
CREATE INDEX "ix_admin_backup_restore_events_backup_id" ON "admin_backup_restore_events"("backup_id");

-- CreateIndex
CREATE INDEX "ix_admin_backup_restore_events_created_at" ON "admin_backup_restore_events"("created_at");

-- CreateIndex
CREATE INDEX "ix_admin_backup_restore_events_id" ON "admin_backup_restore_events"("id");

-- CreateIndex
CREATE INDEX "ix_admin_backup_restore_events_initiator_org_id" ON "admin_backup_restore_events"("initiator_org_id");

-- CreateIndex
CREATE INDEX "ix_admin_backup_restore_events_initiator_user_id" ON "admin_backup_restore_events"("initiator_user_id");

-- CreateIndex
CREATE INDEX "ix_admin_backup_restore_events_snapshot_backup_id" ON "admin_backup_restore_events"("snapshot_backup_id");

-- CreateIndex
CREATE INDEX "ix_admin_backup_restore_events_status" ON "admin_backup_restore_events"("status");

-- CreateIndex
CREATE INDEX "ix_admin_restore_audit_backup_id" ON "admin_restore_audit"("backup_id");

-- CreateIndex
CREATE INDEX "ix_admin_restore_audit_created_at" ON "admin_restore_audit"("created_at");

-- CreateIndex
CREATE INDEX "ix_admin_restore_audit_id" ON "admin_restore_audit"("id");

-- CreateIndex
CREATE INDEX "ix_admin_restore_audit_organization_id" ON "admin_restore_audit"("organization_id");

-- CreateIndex
CREATE INDEX "ix_admin_restore_audit_pre_restore_snapshot_id" ON "admin_restore_audit"("pre_restore_snapshot_id");

-- CreateIndex
CREATE INDEX "ix_admin_restore_audit_request_hash" ON "admin_restore_audit"("request_hash");

-- CreateIndex
CREATE INDEX "ix_admin_restore_audit_result" ON "admin_restore_audit"("result");

-- CreateIndex
CREATE INDEX "ix_admin_restore_audit_user_id" ON "admin_restore_audit"("user_id");

-- CreateIndex
CREATE INDEX "ix_ai_audit_log_created_at" ON "ai_audit_log"("created_at");

-- CreateIndex
CREATE INDEX "ix_ai_audit_log_id" ON "ai_audit_log"("id");

-- CreateIndex
CREATE INDEX "ix_ai_audit_log_organization_id" ON "ai_audit_log"("organization_id");

-- CreateIndex
CREATE INDEX "ix_ai_audit_log_user_id" ON "ai_audit_log"("user_id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_attach_links_action_type" ON "ai_contract_attach_links"("action_type");

-- CreateIndex
CREATE INDEX "ix_ai_contract_attach_links_created_at" ON "ai_contract_attach_links"("created_at");

-- CreateIndex
CREATE INDEX "ix_ai_contract_attach_links_id" ON "ai_contract_attach_links"("id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_attach_links_organization_id" ON "ai_contract_attach_links"("organization_id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_attach_links_run_id" ON "ai_contract_attach_links"("run_id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_attach_runs_contract_id" ON "ai_contract_attach_runs"("contract_id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_attach_runs_created_at" ON "ai_contract_attach_runs"("created_at");

-- CreateIndex
CREATE INDEX "ix_ai_contract_attach_runs_id" ON "ai_contract_attach_runs"("id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_attach_runs_organization_id" ON "ai_contract_attach_runs"("organization_id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_attach_runs_release_id" ON "ai_contract_attach_runs"("release_id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_attach_runs_request_hash" ON "ai_contract_attach_runs"("request_hash");

-- CreateIndex
CREATE INDEX "ix_ai_contract_attach_runs_user_id" ON "ai_contract_attach_runs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ai_contract_attach_runs_org_reqhash" ON "ai_contract_attach_runs"("organization_id", "request_hash");

-- CreateIndex
CREATE INDEX "ix_ai_contract_documents_created_at" ON "ai_contract_documents"("created_at");

-- CreateIndex
CREATE INDEX "ix_ai_contract_documents_file_hash" ON "ai_contract_documents"("file_hash");

-- CreateIndex
CREATE INDEX "ix_ai_contract_documents_id" ON "ai_contract_documents"("id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_documents_organization_id" ON "ai_contract_documents"("organization_id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_documents_release_id" ON "ai_contract_documents"("release_id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_documents_uploaded_by" ON "ai_contract_documents"("uploaded_by");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ai_contract_document_org_release_hash" ON "ai_contract_documents"("organization_id", "release_id", "file_hash");

-- CreateIndex
CREATE INDEX "ix_ai_contract_drafts_created_at" ON "ai_contract_drafts"("created_at");

-- CreateIndex
CREATE INDEX "ix_ai_contract_drafts_created_by" ON "ai_contract_drafts"("created_by");

-- CreateIndex
CREATE INDEX "ix_ai_contract_drafts_file_hash" ON "ai_contract_drafts"("file_hash");

-- CreateIndex
CREATE INDEX "ix_ai_contract_drafts_id" ON "ai_contract_drafts"("id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_drafts_organization_id" ON "ai_contract_drafts"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ai_contract_drafts_org_hash" ON "ai_contract_drafts"("organization_id", "file_hash");

-- CreateIndex
CREATE INDEX "ix_ai_contract_resolution_links_id" ON "ai_contract_resolution_links"("id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_resolution_links_run_id" ON "ai_contract_resolution_links"("run_id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_resolution_runs_contract_hash" ON "ai_contract_resolution_runs"("contract_hash");

-- CreateIndex
CREATE INDEX "ix_ai_contract_resolution_runs_created_at" ON "ai_contract_resolution_runs"("created_at");

-- CreateIndex
CREATE INDEX "ix_ai_contract_resolution_runs_id" ON "ai_contract_resolution_runs"("id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_resolution_runs_organization_id" ON "ai_contract_resolution_runs"("organization_id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_work_links_contract_document_id" ON "ai_contract_work_links"("contract_document_id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_work_links_created_at" ON "ai_contract_work_links"("created_at");

-- CreateIndex
CREATE INDEX "ix_ai_contract_work_links_id" ON "ai_contract_work_links"("id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_work_links_organization_id" ON "ai_contract_work_links"("organization_id");

-- CreateIndex
CREATE INDEX "ix_ai_contract_work_links_work_id" ON "ai_contract_work_links"("work_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ai_contract_work_link_org_doc_work" ON "ai_contract_work_links"("organization_id", "contract_document_id", "work_id");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_apply_events_created_at" ON "ai_core_write_apply_events"("created_at");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_apply_events_id" ON "ai_core_write_apply_events"("id");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_apply_events_organization_id" ON "ai_core_write_apply_events"("organization_id");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_apply_events_request_hash" ON "ai_core_write_apply_events"("request_hash");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_apply_events_run_id" ON "ai_core_write_apply_events"("run_id");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_apply_events_status" ON "ai_core_write_apply_events"("status");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_apply_events_user_id" ON "ai_core_write_apply_events"("user_id");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_items_created_at" ON "ai_core_write_proposal_items"("created_at");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_items_entity_id" ON "ai_core_write_proposal_items"("entity_id");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_items_entity_type" ON "ai_core_write_proposal_items"("entity_type");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_items_id" ON "ai_core_write_proposal_items"("id");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_items_operation" ON "ai_core_write_proposal_items"("operation");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_items_organization_id" ON "ai_core_write_proposal_items"("organization_id");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_items_requires_user_review" ON "ai_core_write_proposal_items"("requires_user_review");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_items_run_id" ON "ai_core_write_proposal_items"("run_id");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_runs_contract_document_id" ON "ai_core_write_proposal_runs"("contract_document_id");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_runs_contract_id" ON "ai_core_write_proposal_runs"("contract_id");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_runs_created_at" ON "ai_core_write_proposal_runs"("created_at");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_runs_id" ON "ai_core_write_proposal_runs"("id");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_runs_organization_id" ON "ai_core_write_proposal_runs"("organization_id");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_runs_release_id" ON "ai_core_write_proposal_runs"("release_id");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_runs_request_hash" ON "ai_core_write_proposal_runs"("request_hash");

-- CreateIndex
CREATE INDEX "ix_ai_core_write_proposal_runs_user_id" ON "ai_core_write_proposal_runs"("user_id");

-- CreateIndex
CREATE INDEX "ix_ai_messages_id" ON "ai_messages"("id");

-- CreateIndex
CREATE INDEX "ix_ai_messages_session_id" ON "ai_messages"("session_id");

-- CreateIndex
CREATE INDEX "ix_ai_release_integration_links_action" ON "ai_release_integration_links"("action");

-- CreateIndex
CREATE INDEX "ix_ai_release_integration_links_created_at" ON "ai_release_integration_links"("created_at");

-- CreateIndex
CREATE INDEX "ix_ai_release_integration_links_entity_id" ON "ai_release_integration_links"("entity_id");

-- CreateIndex
CREATE INDEX "ix_ai_release_integration_links_entity_type" ON "ai_release_integration_links"("entity_type");

-- CreateIndex
CREATE INDEX "ix_ai_release_integration_links_id" ON "ai_release_integration_links"("id");

-- CreateIndex
CREATE INDEX "ix_ai_release_integration_links_organization_id" ON "ai_release_integration_links"("organization_id");

-- CreateIndex
CREATE INDEX "ix_ai_release_integration_links_run_id" ON "ai_release_integration_links"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ai_release_integration_link_org_run_entity_action" ON "ai_release_integration_links"("organization_id", "run_id", "entity_type", "entity_id", "action");

-- CreateIndex
CREATE INDEX "ix_ai_release_integration_runs_contract_id" ON "ai_release_integration_runs"("contract_id");

-- CreateIndex
CREATE INDEX "ix_ai_release_integration_runs_created_at" ON "ai_release_integration_runs"("created_at");

-- CreateIndex
CREATE INDEX "ix_ai_release_integration_runs_id" ON "ai_release_integration_runs"("id");

-- CreateIndex
CREATE INDEX "ix_ai_release_integration_runs_organization_id" ON "ai_release_integration_runs"("organization_id");

-- CreateIndex
CREATE INDEX "ix_ai_release_integration_runs_release_id" ON "ai_release_integration_runs"("release_id");

-- CreateIndex
CREATE INDEX "ix_ai_release_integration_runs_user_id" ON "ai_release_integration_runs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ai_release_integration_run_org_release_hash" ON "ai_release_integration_runs"("organization_id", "release_id", "request_hash");

-- CreateIndex
CREATE INDEX "ix_ai_royalty_simulation_runs_contract_document_id" ON "ai_royalty_simulation_runs"("contract_document_id");

-- CreateIndex
CREATE INDEX "ix_ai_royalty_simulation_runs_created_at" ON "ai_royalty_simulation_runs"("created_at");

-- CreateIndex
CREATE INDEX "ix_ai_royalty_simulation_runs_id" ON "ai_royalty_simulation_runs"("id");

-- CreateIndex
CREATE INDEX "ix_ai_royalty_simulation_runs_organization_id" ON "ai_royalty_simulation_runs"("organization_id");

-- CreateIndex
CREATE INDEX "ix_ai_royalty_simulation_runs_release_id" ON "ai_royalty_simulation_runs"("release_id");

-- CreateIndex
CREATE INDEX "ix_ai_royalty_simulation_runs_user_id" ON "ai_royalty_simulation_runs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ai_royalty_run_org_release_hash" ON "ai_royalty_simulation_runs"("organization_id", "release_id", "request_hash");

-- CreateIndex
CREATE INDEX "ix_ai_sessions_id" ON "ai_sessions"("id");

-- CreateIndex
CREATE INDEX "ix_ai_sessions_organization_id" ON "ai_sessions"("organization_id");

-- CreateIndex
CREATE INDEX "ix_artist_memberships_group_id" ON "artist_memberships"("group_id");

-- CreateIndex
CREATE INDEX "ix_artist_memberships_member_id" ON "artist_memberships"("member_id");

-- CreateIndex
CREATE INDEX "ix_membership_org_group" ON "artist_memberships"("organization_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "ix_membership_group_member" ON "artist_memberships"("group_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "ix_artists_artist_id" ON "artists"("artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "ix_artists_name_unique" ON "artists"("name");

-- CreateIndex
CREATE INDEX "ix_artists_id" ON "artists"("id");

-- CreateIndex
CREATE INDEX "ix_artists_name" ON "artists"("name");

-- CreateIndex
CREATE INDEX "ix_artists_organization_id" ON "artists"("organization_id");

-- CreateIndex
CREATE INDEX "ix_audit_logs_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "ix_audit_logs_created_at" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "ix_audit_logs_entity_type" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "ix_audit_logs_entity_uuid" ON "audit_logs"("entity_uuid");

-- CreateIndex
CREATE INDEX "ix_audit_logs_id" ON "audit_logs"("id");

-- CreateIndex
CREATE INDEX "ix_audit_logs_organization_id" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "ix_contract_assets_org_contract" ON "contract_assets"("organization_id", "contract_id");

-- CreateIndex
CREATE INDEX "ix_contract_documents_org_contract" ON "contract_documents"("organization_id", "contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "ix_contract_documents_unique_version" ON "contract_documents"("contract_id", "version");

-- CreateIndex
CREATE INDEX "ix_contract_intake_release_links_created_at" ON "contract_intake_release_links"("created_at");

-- CreateIndex
CREATE INDEX "ix_contract_intake_release_links_id" ON "contract_intake_release_links"("id");

-- CreateIndex
CREATE INDEX "ix_contract_intake_release_links_organization_id" ON "contract_intake_release_links"("organization_id");

-- CreateIndex
CREATE INDEX "ix_contract_intake_release_links_release_id" ON "contract_intake_release_links"("release_id");

-- CreateIndex
CREATE INDEX "ix_contract_intake_release_links_resolution_run_id" ON "contract_intake_release_links"("resolution_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_contract_intake_release_link_org_run_release" ON "contract_intake_release_links"("organization_id", "resolution_run_id", "release_id");

-- CreateIndex
CREATE INDEX "ix_contract_parties_org_contract" ON "contract_parties"("organization_id", "contract_id");

-- CreateIndex
CREATE INDEX "ix_contract_split_groups_org_contract" ON "contract_split_groups"("organization_id", "contract_id");

-- CreateIndex
CREATE INDEX "ix_contract_splits_org_group" ON "contract_splits"("organization_id", "group_id");

-- CreateIndex
CREATE INDEX "ix_contract_track_links_contract_id" ON "contract_track_links"("contract_id");

-- CreateIndex
CREATE INDEX "ix_contract_track_links_id" ON "contract_track_links"("id");

-- CreateIndex
CREATE INDEX "ix_contract_track_links_organization_id" ON "contract_track_links"("organization_id");

-- CreateIndex
CREATE INDEX "ix_contract_track_links_track_id" ON "contract_track_links"("track_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_contract_track_link_org_contract_track" ON "contract_track_links"("organization_id", "contract_id", "track_id");

-- CreateIndex
CREATE INDEX "ix_contracts_organization_id" ON "contracts"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "ix_contracts_org_number" ON "contracts"("organization_id", "contract_number");

-- CreateIndex
CREATE INDEX "ix_documents_category" ON "documents"("category");

-- CreateIndex
CREATE INDEX "ix_documents_file_type" ON "documents"("file_type");

-- CreateIndex
CREATE INDEX "ix_documents_id" ON "documents"("id");

-- CreateIndex
CREATE INDEX "ix_documents_organization_id" ON "documents"("organization_id");

-- CreateIndex
CREATE INDEX "ix_events_category" ON "events"("category");

-- CreateIndex
CREATE INDEX "ix_events_event_type" ON "events"("event_type");

-- CreateIndex
CREATE INDEX "ix_events_id" ON "events"("id");

-- CreateIndex
CREATE INDEX "ix_events_organization_id" ON "events"("organization_id");

-- CreateIndex
CREATE INDEX "ix_events_start_datetime" ON "events"("start_datetime");

-- CreateIndex
CREATE INDEX "ix_events_status" ON "events"("status");

-- CreateIndex
CREATE INDEX "ix_events_title" ON "events"("title");

-- CreateIndex
CREATE INDEX "ix_individuals_email" ON "individuals"("email");

-- CreateIndex
CREATE INDEX "ix_individuals_id" ON "individuals"("id");

-- CreateIndex
CREATE INDEX "ix_individuals_organization_id" ON "individuals"("organization_id");

-- CreateIndex
CREATE INDEX "ix_jobs_organization_id" ON "jobs"("organization_id");

-- CreateIndex
CREATE INDEX "ix_jobs_user_id" ON "jobs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ix_labels_label_id" ON "labels"("label_id");

-- CreateIndex
CREATE INDEX "ix_labels_id" ON "labels"("id");

-- CreateIndex
CREATE INDEX "ix_labels_name" ON "labels"("name");

-- CreateIndex
CREATE INDEX "ix_network_relationships_id" ON "network_relationships"("id");

-- CreateIndex
CREATE INDEX "ix_notes_category" ON "notes"("category");

-- CreateIndex
CREATE INDEX "ix_notes_id" ON "notes"("id");

-- CreateIndex
CREATE INDEX "ix_notes_organization_id" ON "notes"("organization_id");

-- CreateIndex
CREATE INDEX "ix_notes_pinned" ON "notes"("pinned");

-- CreateIndex
CREATE INDEX "ix_notes_title" ON "notes"("title");

-- CreateIndex
CREATE INDEX "ix_office_document_links_document_id" ON "office_document_links"("document_id");

-- CreateIndex
CREATE INDEX "ix_office_document_links_entity_id" ON "office_document_links"("entity_id");

-- CreateIndex
CREATE INDEX "ix_office_document_links_entity_type" ON "office_document_links"("entity_type");

-- CreateIndex
CREATE INDEX "ix_office_document_links_organization_id" ON "office_document_links"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_office_document_links_document_entity" ON "office_document_links"("document_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ix_office_documents_doc_type" ON "office_documents"("doc_type");

-- CreateIndex
CREATE INDEX "ix_office_documents_org_doc_type" ON "office_documents"("organization_id", "doc_type");

-- CreateIndex
CREATE INDEX "ix_office_documents_organization_id" ON "office_documents"("organization_id");

-- CreateIndex
CREATE INDEX "ix_office_note_links_entity_id" ON "office_note_links"("entity_id");

-- CreateIndex
CREATE INDEX "ix_office_note_links_entity_type" ON "office_note_links"("entity_type");

-- CreateIndex
CREATE INDEX "ix_office_note_links_note_id" ON "office_note_links"("note_id");

-- CreateIndex
CREATE INDEX "ix_office_note_links_organization_id" ON "office_note_links"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_office_note_links_note_entity" ON "office_note_links"("note_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ix_office_notes_organization_id" ON "office_notes"("organization_id");

-- CreateIndex
CREATE INDEX "ix_organizations_id" ON "organizations"("id");

-- CreateIndex
CREATE INDEX "ix_organizations_name" ON "organizations"("name");

-- CreateIndex
CREATE INDEX "ix_organizations_org_type" ON "organizations"("org_type");

-- CreateIndex
CREATE INDEX "ix_organizations_organization_id" ON "organizations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE INDEX "ix_plans_id" ON "plans"("id");

-- CreateIndex
CREATE INDEX "ix_platforms_id" ON "platforms"("id");

-- CreateIndex
CREATE INDEX "ix_platforms_name" ON "platforms"("name");

-- CreateIndex
CREATE INDEX "ix_platforms_platform_type" ON "platforms"("platform_type");

-- CreateIndex
CREATE UNIQUE INDEX "ix_playlists_playlist_id" ON "playlists"("playlist_id");

-- CreateIndex
CREATE UNIQUE INDEX "playlists_share_link_key" ON "playlists"("share_link");

-- CreateIndex
CREATE INDEX "ix_playlists_id" ON "playlists"("id");

-- CreateIndex
CREATE INDEX "ix_playlists_name" ON "playlists"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ix_pros_pro_id" ON "pros"("pro_id");

-- CreateIndex
CREATE INDEX "ix_pros_id" ON "pros"("id");

-- CreateIndex
CREATE INDEX "ix_pros_name" ON "pros"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ix_publishers_publisher_id" ON "publishers"("publisher_id");

-- CreateIndex
CREATE INDEX "ix_publishers_id" ON "publishers"("id");

-- CreateIndex
CREATE INDEX "ix_publishers_name" ON "publishers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ix_releases_release_id" ON "releases"("release_id");

-- CreateIndex
CREATE UNIQUE INDEX "releases_upc_code_key" ON "releases"("upc_code");

-- CreateIndex
CREATE UNIQUE INDEX "ix_releases_catalog_number" ON "releases"("catalog_number");

-- CreateIndex
CREATE INDEX "ix_releases_id" ON "releases"("id");

-- CreateIndex
CREATE INDEX "ix_releases_organization_id" ON "releases"("organization_id");

-- CreateIndex
CREATE INDEX "ix_releases_title" ON "releases"("title");

-- CreateIndex
CREATE INDEX "ix_report_artifacts_organization_id" ON "report_artifacts"("organization_id");

-- CreateIndex
CREATE INDEX "ix_report_artifacts_report_run_id" ON "report_artifacts"("report_run_id");

-- CreateIndex
CREATE INDEX "ix_report_definitions_organization_id" ON "report_definitions"("organization_id");

-- CreateIndex
CREATE INDEX "ix_report_definitions_report_type" ON "report_definitions"("report_type");

-- CreateIndex
CREATE UNIQUE INDEX "uq_report_definitions_org_name" ON "report_definitions"("organization_id", "name");

-- CreateIndex
CREATE INDEX "ix_report_runs_organization_id" ON "report_runs"("organization_id");

-- CreateIndex
CREATE INDEX "ix_report_runs_report_definition_id" ON "report_runs"("report_definition_id");

-- CreateIndex
CREATE INDEX "ix_report_runs_status" ON "report_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ix_royalties_royalty_id" ON "royalties"("royalty_id");

-- CreateIndex
CREATE INDEX "ix_royalties_id" ON "royalties"("id");

-- CreateIndex
CREATE INDEX "ix_royalties_source" ON "royalties"("source");

-- CreateIndex
CREATE INDEX "ix_royalties_statement_date" ON "royalties"("statement_date");

-- CreateIndex
CREATE INDEX "ix_status_quo_items_entity_id" ON "status_quo_items"("entity_id");

-- CreateIndex
CREATE INDEX "ix_status_quo_items_entity_type" ON "status_quo_items"("entity_type");

-- CreateIndex
CREATE INDEX "ix_status_quo_items_id" ON "status_quo_items"("id");

-- CreateIndex
CREATE INDEX "ix_status_quo_items_issue_type" ON "status_quo_items"("issue_type");

-- CreateIndex
CREATE INDEX "ix_status_quo_items_organization_id" ON "status_quo_items"("organization_id");

-- CreateIndex
CREATE INDEX "ix_subscriptions_id" ON "subscriptions"("id");

-- CreateIndex
CREATE INDEX "ix_subscriptions_organization_id" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "ix_tasks_id" ON "tasks"("id");

-- CreateIndex
CREATE INDEX "ix_tasks_organization_id" ON "tasks"("organization_id");

-- CreateIndex
CREATE INDEX "ix_tasks_source_id" ON "tasks"("source_id");

-- CreateIndex
CREATE INDEX "ix_tasks_source_type" ON "tasks"("source_type");

-- CreateIndex
CREATE INDEX "ix_tasks_title" ON "tasks"("title");

-- CreateIndex
CREATE UNIQUE INDEX "uq_task_org_source" ON "tasks"("organization_id", "source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "ix_tracks_track_id" ON "tracks"("track_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_isrc_code_key" ON "tracks"("isrc_code");

-- CreateIndex
CREATE INDEX "ix_tracks_genre" ON "tracks"("genre");

-- CreateIndex
CREATE INDEX "ix_tracks_id" ON "tracks"("id");

-- CreateIndex
CREATE INDEX "ix_tracks_title" ON "tracks"("title");

-- CreateIndex
CREATE INDEX "ix_usage_id" ON "usage"("id");

-- CreateIndex
CREATE INDEX "ix_usage_org_metric_period" ON "usage"("organization_id", "metric", "period");

-- CreateIndex
CREATE INDEX "ix_usage_organization_id" ON "usage"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "ix_works_work_id" ON "works"("work_id");

-- CreateIndex
CREATE INDEX "ix_works_id" ON "works"("id");

-- CreateIndex
CREATE INDEX "ix_works_organization_id" ON "works"("organization_id");

-- CreateIndex
CREATE INDEX "ix_works_title" ON "works"("title");

-- CreateIndex
CREATE UNIQUE INDEX "works_admin_work_id_key" ON "works_admin"("work_id");

-- CreateIndex
CREATE UNIQUE INDEX "ix_works_admin_org_work" ON "works_admin"("organization_id", "work_id");

-- CreateIndex
CREATE INDEX "ix_works_admin_documents_organization_id" ON "works_admin_documents"("organization_id");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_backup_artifacts" ADD CONSTRAINT "admin_backup_artifacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_backup_restore_events" ADD CONSTRAINT "admin_backup_restore_events_initiator_user_id_fkey" FOREIGN KEY ("initiator_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_restore_audit" ADD CONSTRAINT "admin_restore_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_contract_attach_links" ADD CONSTRAINT "ai_contract_attach_links_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ai_contract_attach_runs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_contract_attach_runs" ADD CONSTRAINT "ai_contract_attach_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_contract_documents" ADD CONSTRAINT "ai_contract_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_contract_drafts" ADD CONSTRAINT "ai_contract_drafts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_contract_resolution_links" ADD CONSTRAINT "ai_contract_resolution_links_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ai_contract_resolution_runs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_contract_resolution_runs" ADD CONSTRAINT "ai_contract_resolution_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_contract_work_links" ADD CONSTRAINT "ai_contract_work_links_contract_document_id_fkey" FOREIGN KEY ("contract_document_id") REFERENCES "ai_contract_documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_core_write_apply_events" ADD CONSTRAINT "ai_core_write_apply_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ai_core_write_proposal_runs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_core_write_apply_events" ADD CONSTRAINT "ai_core_write_apply_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_core_write_proposal_items" ADD CONSTRAINT "ai_core_write_proposal_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ai_core_write_proposal_runs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_core_write_proposal_runs" ADD CONSTRAINT "ai_core_write_proposal_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_release_integration_links" ADD CONSTRAINT "ai_release_integration_links_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ai_release_integration_runs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_release_integration_runs" ADD CONSTRAINT "ai_release_integration_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_royalty_simulation_runs" ADD CONSTRAINT "ai_royalty_simulation_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "artist_memberships" ADD CONSTRAINT "artist_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "artist_memberships" ADD CONSTRAINT "artist_memberships_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "artists" ADD CONSTRAINT "artists_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "labels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "artists" ADD CONSTRAINT "artists_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "pros"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "artists" ADD CONSTRAINT "artists_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_assets" ADD CONSTRAINT "contract_assets_v1_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_v1_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_intake_release_links" ADD CONSTRAINT "contract_intake_release_links_linked_by_user_id_fkey" FOREIGN KEY ("linked_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_intake_release_links" ADD CONSTRAINT "contract_intake_release_links_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_intake_release_links" ADD CONSTRAINT "contract_intake_release_links_resolution_run_id_fkey" FOREIGN KEY ("resolution_run_id") REFERENCES "ai_contract_resolution_runs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_parties" ADD CONSTRAINT "contract_parties_v1_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_split_groups" ADD CONSTRAINT "contract_split_groups_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_splits" ADD CONSTRAINT "contract_splits_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "contract_split_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_splits" ADD CONSTRAINT "contract_splits_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "contract_parties"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_track_links" ADD CONSTRAINT "contract_track_links_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_track_links" ADD CONSTRAINT "contract_track_links_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_parent_document_id_fkey" FOREIGN KEY ("parent_document_id") REFERENCES "documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "individual_organizations" ADD CONSTRAINT "individual_organizations_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "individuals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "individual_organizations" ADD CONSTRAINT "individual_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "office_document_links" ADD CONSTRAINT "office_document_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "office_documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "office_documents" ADD CONSTRAINT "office_documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "office_note_links" ADD CONSTRAINT "office_note_links_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "office_notes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "office_notes" ADD CONSTRAINT "office_notes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "fk_releases_distributor_id_organizations" FOREIGN KEY ("distributor_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "labels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "report_artifacts" ADD CONSTRAINT "report_artifacts_report_run_id_fkey" FOREIGN KEY ("report_run_id") REFERENCES "report_runs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_report_definition_id_fkey" FOREIGN KEY ("report_definition_id") REFERENCES "report_definitions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "royalties" ADD CONSTRAINT "royalties_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "royalties" ADD CONSTRAINT "royalties_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "royalties" ADD CONSTRAINT "royalties_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "status_quo_items" ADD CONSTRAINT "status_quo_items_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_assigned_to_user_id" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "track_releases" ADD CONSTRAINT "track_releases_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "track_releases" ADD CONSTRAINT "track_releases_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "pros"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "works_admin" ADD CONSTRAINT "works_admin_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "works_admin_documents" ADD CONSTRAINT "works_admin_documents_works_admin_id_fkey" FOREIGN KEY ("works_admin_id") REFERENCES "works_admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

