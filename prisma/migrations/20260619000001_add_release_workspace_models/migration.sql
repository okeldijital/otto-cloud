-- Create new release workspace tables

-- Release Playbooks
CREATE TABLE "release_playbooks" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "release_type" VARCHAR(50),
    "icon" VARCHAR(50),
    "color" VARCHAR(7),
    "is_built_in" BOOLEAN DEFAULT false,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "release_playbooks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_release_playbooks_org_slug" ON "release_playbooks"("organization_id", "slug");
CREATE INDEX "ix_release_playbooks_organization_id" ON "release_playbooks"("organization_id");

-- Playbook Tasks
CREATE TABLE "playbook_tasks" (
    "id" SERIAL NOT NULL,
    "playbook_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "section" VARCHAR(100),
    "department" VARCHAR(100),
    "priority" VARCHAR(20) DEFAULT 'medium',
    "sort_order" INTEGER DEFAULT 0,
    "days_before_release" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playbook_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_playbook_tasks_playbook_id" ON "playbook_tasks"("playbook_id");
ALTER TABLE "playbook_tasks" ADD CONSTRAINT "playbook_tasks_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "release_playbooks"("id") ON DELETE CASCADE;

-- Playbook Milestones
CREATE TABLE "playbook_milestones" (
    "id" SERIAL NOT NULL,
    "playbook_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "section" VARCHAR(100),
    "sort_order" INTEGER DEFAULT 0,
    "days_before_release" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playbook_milestones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_playbook_milestones_playbook_id" ON "playbook_milestones"("playbook_id");
ALTER TABLE "playbook_milestones" ADD CONSTRAINT "playbook_milestones_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "release_playbooks"("id") ON DELETE CASCADE;

-- Playbook Deliverables
CREATE TABLE "playbook_deliverables" (
    "id" SERIAL NOT NULL,
    "playbook_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "deliverable_type" VARCHAR(100),
    "sort_order" INTEGER DEFAULT 0,
    "days_before_release" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playbook_deliverables_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_playbook_deliverables_playbook_id" ON "playbook_deliverables"("playbook_id");
ALTER TABLE "playbook_deliverables" ADD CONSTRAINT "playbook_deliverables_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "release_playbooks"("id") ON DELETE CASCADE;

-- Playbook Approvals
CREATE TABLE "playbook_approvals" (
    "id" SERIAL NOT NULL,
    "playbook_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "item_type" VARCHAR(100),
    "sort_order" INTEGER DEFAULT 0,
    "days_before_release" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playbook_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_playbook_approvals_playbook_id" ON "playbook_approvals"("playbook_id");
ALTER TABLE "playbook_approvals" ADD CONSTRAINT "playbook_approvals_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "release_playbooks"("id") ON DELETE CASCADE;

-- Workspace Deliverables
CREATE TABLE "workspace_deliverables" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "deliverable_type" VARCHAR(100),
    "status" VARCHAR(50) DEFAULT 'not_started',
    "priority" VARCHAR(20) DEFAULT 'medium',
    "due_date" TIMESTAMPTZ(6),
    "assigned_to" INTEGER,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMPTZ(6),
    "version" INTEGER DEFAULT 1,
    "file_path" VARCHAR(500),
    "notes" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "is_deleted" BOOLEAN DEFAULT false,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "workspace_deliverables_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_deliverables_workspace_id" ON "workspace_deliverables"("workspace_id");
CREATE INDEX "ix_workspace_deliverables_status" ON "workspace_deliverables"("status");
CREATE INDEX "ix_workspace_deliverables_organization_id" ON "workspace_deliverables"("organization_id");
ALTER TABLE "workspace_deliverables" ADD CONSTRAINT "workspace_deliverables_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;

-- Workspace Milestones
CREATE TABLE "workspace_milestones" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "section" VARCHAR(100),
    "due_date" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "status" VARCHAR(50) DEFAULT 'pending',
    "sort_order" INTEGER DEFAULT 0,
    "is_deleted" BOOLEAN DEFAULT false,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "workspace_milestones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_milestones_workspace_id" ON "workspace_milestones"("workspace_id");
CREATE INDEX "ix_workspace_milestones_status" ON "workspace_milestones"("status");
CREATE INDEX "ix_workspace_milestones_organization_id" ON "workspace_milestones"("organization_id");
ALTER TABLE "workspace_milestones" ADD CONSTRAINT "workspace_milestones_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;

-- Workspace Approvals
CREATE TABLE "workspace_approvals" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "item_type" VARCHAR(100),
    "item_id" INTEGER,
    "status" VARCHAR(50) DEFAULT 'pending',
    "requested_by" INTEGER,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMPTZ(6),
    "comments" TEXT,
    "due_date" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "workspace_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_approvals_workspace_id" ON "workspace_approvals"("workspace_id");
CREATE INDEX "ix_workspace_approvals_status" ON "workspace_approvals"("status");
CREATE INDEX "ix_workspace_approvals_organization_id" ON "workspace_approvals"("organization_id");
ALTER TABLE "workspace_approvals" ADD CONSTRAINT "workspace_approvals_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;

-- Workspace Publications
CREATE TABLE "workspace_publications" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "platform" VARCHAR(100) NOT NULL,
    "content_type" VARCHAR(100),
    "title" VARCHAR(255),
    "content" TEXT,
    "status" VARCHAR(50) DEFAULT 'draft',
    "scheduled_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "url" VARCHAR(500),
    "created_by" INTEGER,
    "is_deleted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "workspace_publications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_publications_workspace_id" ON "workspace_publications"("workspace_id");
CREATE INDEX "ix_workspace_publications_platform" ON "workspace_publications"("platform");
CREATE INDEX "ix_workspace_publications_status" ON "workspace_publications"("status");
CREATE INDEX "ix_workspace_publications_organization_id" ON "workspace_publications"("organization_id");
ALTER TABLE "workspace_publications" ADD CONSTRAINT "workspace_publications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;

-- Workspace Videos
CREATE TABLE "workspace_videos" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "video_type" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(50) DEFAULT 'planning',
    "due_date" TIMESTAMPTZ(6),
    "editor_id" INTEGER,
    "script" TEXT,
    "file_path" VARCHAR(500),
    "url" VARCHAR(500),
    "duration_seconds" INTEGER,
    "approved" BOOLEAN DEFAULT false,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN DEFAULT false,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "workspace_videos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_videos_workspace_id" ON "workspace_videos"("workspace_id");
CREATE INDEX "ix_workspace_videos_video_type" ON "workspace_videos"("video_type");
CREATE INDEX "ix_workspace_videos_status" ON "workspace_videos"("status");
CREATE INDEX "ix_workspace_videos_organization_id" ON "workspace_videos"("organization_id");
ALTER TABLE "workspace_videos" ADD CONSTRAINT "workspace_videos_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;

-- Workspace Marketing Phases
CREATE TABLE "workspace_marketing_phases" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(200),
    "description" TEXT,
    "start_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),
    "sort_order" INTEGER DEFAULT 0,
    "is_deleted" BOOLEAN DEFAULT false,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "workspace_marketing_phases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_marketing_phases_workspace_id" ON "workspace_marketing_phases"("workspace_id");
CREATE INDEX "ix_workspace_marketing_phases_organization_id" ON "workspace_marketing_phases"("organization_id");
ALTER TABLE "workspace_marketing_phases" ADD CONSTRAINT "workspace_marketing_phases_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;

-- Workspace Marketing Tasks
CREATE TABLE "workspace_marketing_tasks" (
    "id" SERIAL NOT NULL,
    "phase_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(50) DEFAULT 'not_started',
    "priority" VARCHAR(20) DEFAULT 'medium',
    "assigned_to" INTEGER,
    "due_date" TIMESTAMPTZ(6),
    "sort_order" INTEGER DEFAULT 0,
    "is_deleted" BOOLEAN DEFAULT false,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "workspace_marketing_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_marketing_tasks_phase_id" ON "workspace_marketing_tasks"("phase_id");
CREATE INDEX "ix_workspace_marketing_tasks_organization_id" ON "workspace_marketing_tasks"("organization_id");
ALTER TABLE "workspace_marketing_tasks" ADD CONSTRAINT "workspace_marketing_tasks_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "workspace_marketing_phases"("id") ON DELETE CASCADE;

-- Workspace Discussion Channels
CREATE TABLE "workspace_discussion_channels" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "is_deleted" BOOLEAN DEFAULT false,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_discussion_channels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_workspace_discussion_channels_slug" ON "workspace_discussion_channels"("workspace_id", "slug");
CREATE INDEX "ix_workspace_discussion_channels_workspace_id" ON "workspace_discussion_channels"("workspace_id");
CREATE INDEX "ix_workspace_discussion_channels_organization_id" ON "workspace_discussion_channels"("organization_id");
ALTER TABLE "workspace_discussion_channels" ADD CONSTRAINT "workspace_discussion_channels_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;

-- Workspace Discussion Messages
CREATE TABLE "workspace_discussion_messages" (
    "id" SERIAL NOT NULL,
    "channel_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "content" TEXT NOT NULL,
    "user_id" INTEGER,
    "edited_at" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_discussion_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_discussion_messages_channel_id" ON "workspace_discussion_messages"("channel_id");
CREATE INDEX "ix_workspace_discussion_messages_organization_id" ON "workspace_discussion_messages"("organization_id");
ALTER TABLE "workspace_discussion_messages" ADD CONSTRAINT "workspace_discussion_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "workspace_discussion_channels"("id") ON DELETE CASCADE;

-- Workspace Readiness Scores
CREATE TABLE "workspace_readiness_scores" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "overall_score" DOUBLE PRECISION DEFAULT 0,
    "metadata_score" DOUBLE PRECISION DEFAULT 0,
    "artwork_score" DOUBLE PRECISION DEFAULT 0,
    "marketing_score" DOUBLE PRECISION DEFAULT 0,
    "distribution_score" DOUBLE PRECISION DEFAULT 0,
    "approvals_score" DOUBLE PRECISION DEFAULT 0,
    "videos_score" DOUBLE PRECISION DEFAULT 0,
    "breakdown_json" TEXT,
    "calculated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_readiness_scores_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_workspace_readiness_scores_workspace_id" ON "workspace_readiness_scores"("workspace_id");
CREATE INDEX "ix_workspace_readiness_scores_organization_id" ON "workspace_readiness_scores"("organization_id");
ALTER TABLE "workspace_readiness_scores" ADD CONSTRAINT "workspace_readiness_scores_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;

-- Add release_id to workspaces
CREATE UNIQUE INDEX "uq_workspaces_release_id" ON "workspaces"("release_id");
