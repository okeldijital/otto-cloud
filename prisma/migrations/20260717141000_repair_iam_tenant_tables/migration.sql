-- Repair migration: reconcile IAM / multi-tenant schema with the migration history.
--
-- Background: the `tenants`, `roles`, `permissions`, `team_*` and `invitations`
-- tables, plus the `tenant_id` column added to ~50 existing tables, were added
-- to the Prisma schema (IAM / Teams / multi-tenancy work) but were never
-- captured in a migration. They existed only in the development database, so
-- `prisma migrate dev` could never reproduce them from a clean clone.
--
-- This migration brings a database that has applied the preceding migrations to
-- full parity with the schema by adding the `tenant_id` columns, creating the
-- missing tables, and adding their indexes and foreign keys. It is the exact
-- diff Prisma computes between the migration history and the current schema, so
-- it is safe to replay on a fresh database and is registered as applied on the
-- existing development database (which already contains these objects).

-- AlterTable
ALTER TABLE "admin_backup_artifacts" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "admin_backup_restore_events" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "admin_restore_audit" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_audit_log" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_contract_attach_links" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_contract_attach_runs" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_contract_documents" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_contract_drafts" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_contract_resolution_links" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_contract_resolution_runs" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_contract_work_links" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_core_write_apply_events" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_core_write_proposal_items" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_core_write_proposal_runs" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_messages" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_release_integration_links" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_release_integration_runs" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_royalty_simulation_runs" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "ai_sessions" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "contract_assets" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "contract_documents" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "contract_intake_release_links" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "contract_parties" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "contract_split_groups" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "contract_splits" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "contract_track_links" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "individuals" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "office_document_links" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "office_documents" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "office_note_links" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "office_notes" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "playlists" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "releases" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "report_artifacts" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "report_definitions" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "report_runs" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "royalties" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "sso_providers" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "status_quo_items" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "usage" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "department" VARCHAR(100),
ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "works" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "works_admin" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "works_admin_documents" ADD COLUMN     "tenant_id" UUID;

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(255),
    "legal_name" VARCHAR(255),
    "org_type" VARCHAR(100),
    "logo_url" VARCHAR(500),
    "banner_url" VARCHAR(500),
    "brand_color" VARCHAR(7) DEFAULT '#6366f1',
    "secondary_color" VARCHAR(7) DEFAULT '#8b5cf6',
    "accent_color" VARCHAR(7) DEFAULT '#06b6d4',
    "email_signature" TEXT,
    "report_branding" JSON,
    "pdf_branding" JSON,
    "invoice_branding" JSON,
    "website" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "physical_address" TEXT,
    "country" VARCHAR(100),
    "province_state" VARCHAR(100),
    "city" VARCHAR(100),
    "currency" VARCHAR(3) DEFAULT 'USD',
    "timezone" VARCHAR(50) DEFAULT 'America/New_York',
    "tax_number" VARCHAR(100),
    "registration_number" VARCHAR(100),
    "subscription_plan" VARCHAR(50),
    "ai_model" VARCHAR(100) DEFAULT 'gpt-4',
    "ai_prompt_library" JSON,
    "ai_knowledge_base" JSON,
    "ai_allowed_agents" JSON,
    "ai_monthly_budget" DECIMAL(10,2) DEFAULT 100.0,
    "owner_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_users" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "invited_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMPTZ(6),
    "invited_by" INTEGER,

    CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "invited_by" INTEGER NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "role_id" INTEGER,
    "message" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "organization_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "organization_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" VARCHAR(50),

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_tenants_name" ON "tenants"("name");

-- CreateIndex
CREATE INDEX "ix_tenant_users_tenant_id" ON "tenant_users"("tenant_id");

-- CreateIndex
CREATE INDEX "ix_tenant_users_user_id" ON "tenant_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_tenant_users" ON "tenant_users"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "ix_invitations_tenant_id" ON "invitations"("tenant_id");

-- CreateIndex
CREATE INDEX "ix_invitations_email" ON "invitations"("email");

-- CreateIndex
CREATE INDEX "ix_invitations_token" ON "invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "ix_roles_name" ON "roles"("name");

-- CreateIndex
CREATE INDEX "ix_roles_organization_id" ON "roles"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "ix_permissions_code" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "ix_permissions_module" ON "permissions"("module");

-- CreateIndex
CREATE INDEX "ix_role_permissions_role_id" ON "role_permissions"("role_id");

-- CreateIndex
CREATE INDEX "ix_role_permissions_permission_id" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_role_permissions" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "ix_user_roles_user_id" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "ix_user_roles_role_id" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_roles" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "ix_teams_organization_id" ON "teams"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_teams_org_name" ON "teams"("organization_id", "name");

-- CreateIndex
CREATE INDEX "ix_team_members_team_id" ON "team_members"("team_id");

-- CreateIndex
CREATE INDEX "ix_team_members_user_id" ON "team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_team_members" ON "team_members"("team_id", "user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

