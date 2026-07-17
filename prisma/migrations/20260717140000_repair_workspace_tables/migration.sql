-- Repair migration: reconcile Workspace Architecture schema with the database.
--
-- Background: the `workspaces` table and several related tables were added to
-- the Prisma schema (Workspace Architecture + Release Workspace work) but were
-- never migrated. `20260619000001_add_release_workspace_models` assumed
-- `workspaces` already existed and therefore failed shadow-database
-- reconciliation, breaking `prisma migrate dev`.
--
-- That migration has been corrected to create `workspaces` itself (making the
-- chain replayable from scratch), and this repair migration brings a database
-- that has applied up to and including `20260619000001` to full parity with
-- the current schema by:
--   1. Tightening nullable columns to NOT NULL (matching the schema).
--   2. Creating the remaining workspace tables (templates, members, files,
--      notifications, timeline events, dependencies, dynamic/template fields).
--   3. Adding their indexes and foreign keys.
--
-- This migration is purely additive and idempotent with respect to the corrected
-- `20260619000001`; it applies cleanly on a fresh clone as well as on the
-- repaired development database.

-- AlterTable: enforce NOT NULL columns to match the schema
ALTER TABLE "playbook_approvals" ALTER COLUMN "sort_order" SET NOT NULL;

ALTER TABLE "playbook_deliverables" ALTER COLUMN "sort_order" SET NOT NULL;

ALTER TABLE "playbook_milestones" ALTER COLUMN "sort_order" SET NOT NULL;

ALTER TABLE "playbook_tasks" ALTER COLUMN "sort_order" SET NOT NULL;

ALTER TABLE "release_playbooks" ALTER COLUMN "is_built_in" SET NOT NULL;

ALTER TABLE "workspace_approvals" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "is_deleted" SET NOT NULL;

ALTER TABLE "workspace_deliverables" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "version" SET NOT NULL,
ALTER COLUMN "sort_order" SET NOT NULL,
ALTER COLUMN "is_deleted" SET NOT NULL;

ALTER TABLE "workspace_discussion_channels" ALTER COLUMN "sort_order" SET NOT NULL,
ALTER COLUMN "is_deleted" SET NOT NULL;

ALTER TABLE "workspace_discussion_messages" ALTER COLUMN "is_deleted" SET NOT NULL;

ALTER TABLE "workspace_marketing_phases" ALTER COLUMN "sort_order" SET NOT NULL,
ALTER COLUMN "is_deleted" SET NOT NULL;

ALTER TABLE "workspace_marketing_tasks" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "sort_order" SET NOT NULL,
ALTER COLUMN "is_deleted" SET NOT NULL;

ALTER TABLE "workspace_milestones" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "sort_order" SET NOT NULL,
ALTER COLUMN "is_deleted" SET NOT NULL;

ALTER TABLE "workspace_publications" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "is_deleted" SET NOT NULL;

ALTER TABLE "workspace_readiness_scores" ALTER COLUMN "overall_score" SET NOT NULL,
ALTER COLUMN "metadata_score" SET NOT NULL,
ALTER COLUMN "artwork_score" SET NOT NULL,
ALTER COLUMN "marketing_score" SET NOT NULL,
ALTER COLUMN "distribution_score" SET NOT NULL,
ALTER COLUMN "approvals_score" SET NOT NULL,
ALTER COLUMN "videos_score" SET NOT NULL;

ALTER TABLE "workspace_videos" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "approved" SET NOT NULL,
ALTER COLUMN "is_deleted" SET NOT NULL;

ALTER TABLE "workspaces" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "organization_id" SET NOT NULL,
ALTER COLUMN "is_deleted" SET NOT NULL;

-- CreateTable
CREATE TABLE "workspace_templates" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50),
    "color" VARCHAR(7),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_templates_slug_key" ON "workspace_templates"("slug");
CREATE INDEX "ix_workspace_templates_id" ON "workspace_templates"("id");

-- workspaces.template_id references workspace_templates (created above). This
-- foreign key could not live in 20260619000001 because workspace_templates
-- did not exist yet at that point in the chain.
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workspace_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "workspace_template_sections" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "workspace_template_sections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_template_sections_template_id" ON "workspace_template_sections"("template_id");

-- CreateTable
CREATE TABLE "workspace_template_statuses" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "color" VARCHAR(7),

    CONSTRAINT "workspace_template_statuses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_template_statuses_template_id" ON "workspace_template_statuses"("template_id");

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "name" VARCHAR(255),
    "email" VARCHAR(255),
    "role" VARCHAR(50) NOT NULL DEFAULT 'member',
    "invited_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMPTZ(6),

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_members_workspace_id" ON "workspace_members"("workspace_id");
CREATE INDEX "ix_workspace_members_user_id" ON "workspace_members"("user_id");
CREATE UNIQUE INDEX "uq_workspace_members_workspace_user" ON "workspace_members"("workspace_id", "user_id");

-- CreateTable
CREATE TABLE "workspace_timeline_events" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "event_type" VARCHAR(50) NOT NULL,
    "summary" VARCHAR(255) NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_timeline_events_workspace_id" ON "workspace_timeline_events"("workspace_id");
CREATE INDEX "ix_workspace_timeline_events_created_at" ON "workspace_timeline_events"("created_at");

-- CreateTable
CREATE TABLE "workspace_files" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100),
    "file_size" INTEGER,
    "uploaded_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_files_workspace_id" ON "workspace_files"("workspace_id");
CREATE INDEX "ix_workspace_files_category" ON "workspace_files"("category");

-- CreateTable
CREATE TABLE "workspace_notifications" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" INTEGER,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "link" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_notifications_workspace_id" ON "workspace_notifications"("workspace_id");
CREATE INDEX "ix_workspace_notifications_organization_id" ON "workspace_notifications"("organization_id");
CREATE INDEX "ix_workspace_notifications_user_id" ON "workspace_notifications"("user_id");
CREATE INDEX "ix_workspace_notifications_is_read" ON "workspace_notifications"("is_read");

-- CreateTable
CREATE TABLE "workspace_deliverable_dependencies" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "source_id" INTEGER NOT NULL,
    "target_id" INTEGER NOT NULL,
    "dependency_type" VARCHAR(50) NOT NULL DEFAULT 'blocks',
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_deliverable_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_dep_workspace" ON "workspace_deliverable_dependencies"("workspace_id");
CREATE INDEX "ix_workspace_dep_source" ON "workspace_deliverable_dependencies"("source_id");
CREATE INDEX "ix_workspace_dep_target" ON "workspace_deliverable_dependencies"("target_id");
CREATE UNIQUE INDEX "workspace_deliverable_dependencies_source_id_target_id_depe_key" ON "workspace_deliverable_dependencies"("source_id", "target_id", "dependency_type");

-- CreateTable
CREATE TABLE "workspace_template_fields" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "section_slug" VARCHAR(100),
    "field_key" VARCHAR(100) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "field_type" VARCHAR(50) NOT NULL DEFAULT 'string',
    "options" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" VARCHAR(500),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "default_value" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_template_fields_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_template_fields_template" ON "workspace_template_fields"("template_id");
CREATE UNIQUE INDEX "uq_template_field_key" ON "workspace_template_fields"("template_id", "field_key");

-- CreateTable
CREATE TABLE "workspace_dynamic_fields" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "template_field_id" INTEGER,
    "field_key" VARCHAR(100) NOT NULL,
    "field_value" TEXT,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_dynamic_fields_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_dynamic_fields_workspace" ON "workspace_dynamic_fields"("workspace_id");
CREATE INDEX "ix_workspace_dynamic_fields_org" ON "workspace_dynamic_fields"("organization_id");
CREATE UNIQUE INDEX "uq_workspace_dynamic_field_key" ON "workspace_dynamic_fields"("workspace_id", "field_key");

-- AddForeignKey
ALTER TABLE "workspace_template_sections" ADD CONSTRAINT "workspace_template_sections_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workspace_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_template_statuses" ADD CONSTRAINT "workspace_template_statuses_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workspace_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_timeline_events" ADD CONSTRAINT "workspace_timeline_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_timeline_events" ADD CONSTRAINT "workspace_timeline_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_files" ADD CONSTRAINT "workspace_files_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_files" ADD CONSTRAINT "workspace_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_notifications" ADD CONSTRAINT "workspace_notifications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_notifications" ADD CONSTRAINT "workspace_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_deliverable_dependencies" ADD CONSTRAINT "workspace_deliverable_dependencies_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "workspace_deliverables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_deliverable_dependencies" ADD CONSTRAINT "workspace_deliverable_dependencies_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "workspace_deliverables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_deliverable_dependencies" ADD CONSTRAINT "workspace_deliverable_dependencies_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_template_fields" ADD CONSTRAINT "workspace_template_fields_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workspace_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_dynamic_fields" ADD CONSTRAINT "workspace_dynamic_fields_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
