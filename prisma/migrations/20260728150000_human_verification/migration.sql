-- Human Verification Workspace (Milestone 3.1)

-- Extend draft status domain (application-enforced)
-- no column change required

CREATE TABLE "verification_sessions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "extractionId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "contractId" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMPTZ(6),
    "startedBy" INTEGER,
    "completedAt" TIMESTAMPTZ(6),
    "completedBy" INTEGER,
    "reopenedAt" TIMESTAMPTZ(6),
    "reopenedBy" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verified_fields" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "extractionId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "fieldKey" VARCHAR(64) NOT NULL,
    "fieldLabel" VARCHAR(128) NOT NULL,
    "verifiedValue" TEXT,
    "decision" VARCHAR(32) NOT NULL,
    "aiValue" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "sourceFieldId" UUID,
    "verifiedBy" INTEGER,
    "verifiedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verified_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification_history" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "extractionId" UUID NOT NULL,
    "fieldKey" VARCHAR(64),
    "action" VARCHAR(64) NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "previousState" VARCHAR(32),
    "newState" VARCHAR(32),
    "actorUserId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification_decisions" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "extractionId" UUID NOT NULL,
    "decision" VARCHAR(32) NOT NULL,
    "actorUserId" INTEGER,
    "notes" TEXT,
    "snapshot" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_decisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_verification_session_version" ON "verification_sessions"("extractionId", "version");
CREATE INDEX "ix_verification_sessions_org" ON "verification_sessions"("organizationId");
CREATE INDEX "ix_verification_sessions_document" ON "verification_sessions"("documentId");
CREATE INDEX "ix_verification_sessions_status" ON "verification_sessions"("status");

CREATE UNIQUE INDEX "uq_verified_field_session_key" ON "verified_fields"("sessionId", "fieldKey");
CREATE INDEX "ix_verified_fields_org" ON "verified_fields"("organizationId");
CREATE INDEX "ix_verified_fields_document" ON "verified_fields"("documentId");
CREATE INDEX "ix_verified_fields_extraction" ON "verified_fields"("extractionId");

CREATE INDEX "ix_verification_history_session" ON "verification_history"("sessionId");
CREATE INDEX "ix_verification_history_org" ON "verification_history"("organizationId");
CREATE INDEX "ix_verification_history_created" ON "verification_history"("createdAt");

CREATE INDEX "ix_verification_decisions_session" ON "verification_decisions"("sessionId");
CREATE INDEX "ix_verification_decisions_org" ON "verification_decisions"("organizationId");

ALTER TABLE "verification_sessions"
  ADD CONSTRAINT "verification_sessions_extractionId_fkey"
  FOREIGN KEY ("extractionId") REFERENCES "document_extractions"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "verified_fields"
  ADD CONSTRAINT "verified_fields_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "verification_sessions"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "verification_history"
  ADD CONSTRAINT "verification_history_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "verification_sessions"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "verification_decisions"
  ADD CONSTRAINT "verification_decisions_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "verification_sessions"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
