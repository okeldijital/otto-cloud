-- Rights Management Domain (Milestone 6.0)

CREATE TABLE "rights" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'candidate',
    "previousStatus" VARCHAR(32),
    "statusChangedAt" TIMESTAMPTZ(6),
    "statusChangedBy" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "exclusive" BOOLEAN NOT NULL DEFAULT false,
    "perpetual" BOOLEAN NOT NULL DEFAULT false,
    "effectiveDate" DATE,
    "expirationDate" DATE,
    "renewalDate" DATE,
    "terminationDate" DATE,
    "ownerType" VARCHAR(32),
    "ownerEntityId" VARCHAR(64),
    "ownerName" TEXT,
    "verifiedContractId" UUID,
    "contractId" INTEGER,
    "verificationSessionId" UUID,
    "verifiedVersion" INTEGER,
    "documentId" UUID,
    "clauseReference" TEXT,
    "promotionRunId" UUID,
    "candidateId" UUID,
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMPTZ(6),
    "approvedBy" INTEGER,
    "approvedAt" TIMESTAMPTZ(6),
    "provenance" JSONB NOT NULL DEFAULT '{}',
    "createdBy" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rights_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "right_grants" (
    "id" UUID NOT NULL,
    "rightId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "grantType" VARCHAR(64) NOT NULL,
    "grantScope" TEXT,
    "exclusive" BOOLEAN NOT NULL DEFAULT false,
    "transferable" BOOLEAN NOT NULL DEFAULT false,
    "assignable" BOOLEAN NOT NULL DEFAULT false,
    "sublicensable" BOOLEAN NOT NULL DEFAULT false,
    "revocable" BOOLEAN NOT NULL DEFAULT true,
    "perpetual" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "right_grants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "right_restrictions" (
    "id" UUID NOT NULL,
    "rightId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "restrictionType" VARCHAR(64) NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "effectiveDate" DATE,
    "expirationDate" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "right_restrictions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "right_parties" (
    "id" UUID NOT NULL,
    "rightId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "role" VARCHAR(64) NOT NULL,
    "partyType" VARCHAR(32),
    "partyEntityId" VARCHAR(64),
    "name" TEXT NOT NULL,
    "sharePercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "right_parties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "right_territories" (
    "id" UUID NOT NULL,
    "rightId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "territoryType" VARCHAR(32) NOT NULL,
    "code" VARCHAR(16),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "right_territories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "right_works" (
    "id" UUID NOT NULL,
    "rightId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workId" VARCHAR(64) NOT NULL,
    "workTitle" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "right_works_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "right_releases" (
    "id" UUID NOT NULL,
    "rightId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "releaseId" VARCHAR(64) NOT NULL,
    "releaseTitle" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "right_releases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "right_contract_references" (
    "id" UUID NOT NULL,
    "rightId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "verifiedContractId" UUID,
    "verifiedVersion" INTEGER,
    "role" VARCHAR(32) NOT NULL DEFAULT 'source',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "right_contract_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "right_promotion_runs" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "verifiedContractId" UUID NOT NULL,
    "verifiedVersion" INTEGER NOT NULL,
    "verificationSessionId" UUID,
    "documentId" UUID,
    "status" VARCHAR(32) NOT NULL DEFAULT 'running',
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdBy" INTEGER,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "right_promotion_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "right_candidates" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "promotionRunId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "verifiedContractId" UUID NOT NULL,
    "verifiedVersion" INTEGER NOT NULL,
    "verificationSessionId" UUID,
    "documentId" UUID,
    "category" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "clauseReference" TEXT,
    "exclusive" BOOLEAN NOT NULL DEFAULT false,
    "proposedPayload" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "decisionNotes" TEXT,
    "decidedBy" INTEGER,
    "decidedAt" TIMESTAMPTZ(6),
    "resultingRightId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "right_candidates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "right_history" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "rightId" UUID NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "actorUserId" INTEGER,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "right_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "right_timeline_entries" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "rightId" UUID NOT NULL,
    "entryType" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "actorUserId" INTEGER,
    "payload" JSONB,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "right_timeline_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "right_domain_events" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "rightId" UUID,
    "eventType" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "right_domain_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_rights_org_status" ON "rights"("organizationId", "status");
CREATE INDEX "ix_rights_category" ON "rights"("category");
CREATE INDEX "ix_rights_contract" ON "rights"("contractId");
CREATE INDEX "ix_rights_verified_contract" ON "rights"("verifiedContractId");
CREATE INDEX "ix_rights_owner" ON "rights"("ownerType", "ownerEntityId");
CREATE INDEX "ix_rights_expiration" ON "rights"("expirationDate");

CREATE INDEX "ix_right_grants_right" ON "right_grants"("rightId");
CREATE INDEX "ix_right_restrictions_right" ON "right_restrictions"("rightId");
CREATE INDEX "ix_right_restrictions_type" ON "right_restrictions"("restrictionType");
CREATE INDEX "ix_right_parties_right" ON "right_parties"("rightId");
CREATE INDEX "ix_right_territories_right" ON "right_territories"("rightId");
CREATE INDEX "ix_right_works_right" ON "right_works"("rightId");
CREATE INDEX "ix_right_works_work" ON "right_works"("workId");
CREATE INDEX "ix_right_releases_right" ON "right_releases"("rightId");
CREATE INDEX "ix_right_releases_release" ON "right_releases"("releaseId");
CREATE INDEX "ix_right_contract_refs_right" ON "right_contract_references"("rightId");
CREATE INDEX "ix_right_contract_refs_contract" ON "right_contract_references"("contractId");
CREATE INDEX "ix_right_promotion_runs_org" ON "right_promotion_runs"("organizationId");
CREATE INDEX "ix_right_promotion_runs_contract" ON "right_promotion_runs"("contractId");
CREATE INDEX "ix_right_candidates_org_status" ON "right_candidates"("organizationId", "status");
CREATE INDEX "ix_right_candidates_run" ON "right_candidates"("promotionRunId");
CREATE INDEX "ix_right_candidates_contract" ON "right_candidates"("contractId");
CREATE INDEX "ix_right_history_right" ON "right_history"("rightId");
CREATE INDEX "ix_right_timeline_right" ON "right_timeline_entries"("rightId", "occurredAt");
CREATE INDEX "ix_right_domain_events_org" ON "right_domain_events"("organizationId");
CREATE INDEX "ix_right_domain_events_right" ON "right_domain_events"("rightId");
CREATE INDEX "ix_right_domain_events_type" ON "right_domain_events"("eventType");

ALTER TABLE "right_grants" ADD CONSTRAINT "right_grants_rightId_fkey"
  FOREIGN KEY ("rightId") REFERENCES "rights"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "right_restrictions" ADD CONSTRAINT "right_restrictions_rightId_fkey"
  FOREIGN KEY ("rightId") REFERENCES "rights"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "right_parties" ADD CONSTRAINT "right_parties_rightId_fkey"
  FOREIGN KEY ("rightId") REFERENCES "rights"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "right_territories" ADD CONSTRAINT "right_territories_rightId_fkey"
  FOREIGN KEY ("rightId") REFERENCES "rights"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "right_works" ADD CONSTRAINT "right_works_rightId_fkey"
  FOREIGN KEY ("rightId") REFERENCES "rights"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "right_releases" ADD CONSTRAINT "right_releases_rightId_fkey"
  FOREIGN KEY ("rightId") REFERENCES "rights"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "right_contract_references" ADD CONSTRAINT "right_contract_references_rightId_fkey"
  FOREIGN KEY ("rightId") REFERENCES "rights"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "right_candidates" ADD CONSTRAINT "right_candidates_promotionRunId_fkey"
  FOREIGN KEY ("promotionRunId") REFERENCES "right_promotion_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "right_history" ADD CONSTRAINT "right_history_rightId_fkey"
  FOREIGN KEY ("rightId") REFERENCES "rights"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "right_timeline_entries" ADD CONSTRAINT "right_timeline_entries_rightId_fkey"
  FOREIGN KEY ("rightId") REFERENCES "rights"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
