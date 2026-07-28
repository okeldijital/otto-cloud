-- Release Workspace Contract Integration Read Model (Milestone 5.0)

CREATE TABLE "release_contract_summaries" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "releaseId" INTEGER NOT NULL,
    "contractId" INTEGER NOT NULL,
    "relationshipId" UUID,
    "relationshipType" VARCHAR(64),
    "contractTitle" TEXT,
    "verifiedContractId" UUID,
    "verifiedVersion" INTEGER,
    "verificationStatus" VARCHAR(32),
    "lifecycleStatus" VARCHAR(32),
    "contractStatus" VARCHAR(32),
    "effectiveDate" DATE,
    "expirationDate" DATE,
    "renewalDate" DATE,
    "noticeDeadline" DATE,
    "lastVerifiedAt" TIMESTAMPTZ(6),
    "partiesJson" JSONB NOT NULL DEFAULT '[]',
    "territoriesJson" JSONB NOT NULL DEFAULT '[]',
    "rightsSummary" TEXT,
    "relationshipCount" INTEGER NOT NULL DEFAULT 0,
    "amendmentCount" INTEGER NOT NULL DEFAULT 0,
    "healthStatus" VARCHAR(16) NOT NULL DEFAULT 'warning',
    "healthReasons" JSONB NOT NULL DEFAULT '[]',
    "sourceEventId" UUID,
    "projectedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "release_contract_summaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "release_contract_timeline_entries" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "releaseId" INTEGER NOT NULL,
    "contractId" INTEGER,
    "entryType" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sourceEventId" UUID,
    "sourceEventName" VARCHAR(128),
    "payload" JSONB,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "release_contract_timeline_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_release_contract_summary" ON "release_contract_summaries"("releaseId", "contractId");
CREATE INDEX "ix_release_contract_summary_org" ON "release_contract_summaries"("organizationId");
CREATE INDEX "ix_release_contract_summary_release" ON "release_contract_summaries"("releaseId");
CREATE INDEX "ix_release_contract_summary_contract" ON "release_contract_summaries"("contractId");
CREATE INDEX "ix_release_contract_summary_lifecycle" ON "release_contract_summaries"("lifecycleStatus");
CREATE INDEX "ix_release_contract_summary_health" ON "release_contract_summaries"("healthStatus");
CREATE INDEX "ix_release_contract_summary_expiration" ON "release_contract_summaries"("expirationDate");

CREATE INDEX "ix_release_contract_timeline_release" ON "release_contract_timeline_entries"("releaseId", "occurredAt");
CREATE INDEX "ix_release_contract_timeline_org" ON "release_contract_timeline_entries"("organizationId");
CREATE INDEX "ix_release_contract_timeline_contract" ON "release_contract_timeline_entries"("contractId");
CREATE INDEX "ix_release_contract_timeline_source" ON "release_contract_timeline_entries"("sourceEventId");
