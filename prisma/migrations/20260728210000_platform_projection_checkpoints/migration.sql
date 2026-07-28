-- Platform Projection Framework checkpoints

CREATE TABLE "platform_projection_checkpoints" (
    "id" UUID NOT NULL,
    "projectionName" VARCHAR(128) NOT NULL,
    "organizationId" UUID NOT NULL,
    "lastEventId" UUID,
    "lastEventName" VARCHAR(128),
    "lastEventPublishedAt" TIMESTAMPTZ(6),
    "status" VARCHAR(32) NOT NULL DEFAULT 'idle',
    "lastError" TEXT,
    "lastRebuildAt" TIMESTAMPTZ(6),
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_projection_checkpoints_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_platform_projection_checkpoint"
  ON "platform_projection_checkpoints"("projectionName", "organizationId");
CREATE INDEX "ix_platform_projection_checkpoints_org"
  ON "platform_projection_checkpoints"("organizationId");
CREATE INDEX "ix_platform_projection_checkpoints_status"
  ON "platform_projection_checkpoints"("status");
