-- Royalty Entitlement Domain (Milestone 7.0)

CREATE TABLE "royalty_entitlements" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "revenueCategory" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'candidate',
    "previousStatus" VARCHAR(32),
    "statusChangedAt" TIMESTAMPTZ(6),
    "statusChangedBy" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "rightId" UUID NOT NULL,
    "rightVersion" INTEGER,
    "contractId" INTEGER,
    "verifiedContractId" UUID,
    "verifiedVersion" INTEGER,
    "promotionManifestId" UUID,
    "candidateId" UUID,
    "effectiveDate" DATE,
    "expirationDate" DATE,
    "suspensionDate" DATE,
    "terminationDate" DATE,
    "renewalDate" DATE,
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMPTZ(6),
    "approvedBy" INTEGER,
    "approvedAt" TIMESTAMPTZ(6),
    "provenance" JSONB NOT NULL DEFAULT '{}',
    "createdBy" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "royalty_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "royalty_allocations" (
    "id" UUID NOT NULL,
    "entitlementId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "allocationType" VARCHAR(32) NOT NULL,
    "splitType" VARCHAR(32) NOT NULL DEFAULT 'fractional',
    "percentage" DOUBLE PRECISION,
    "fixedAmount" DOUBLE PRECISION,
    "priority" INTEGER,
    "currency" VARCHAR(8),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "royalty_allocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "revenue_shares" (
    "id" UUID NOT NULL,
    "allocationId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "beneficiaryId" UUID,
    "beneficiaryName" TEXT NOT NULL,
    "sharePercent" DOUBLE PRECISION,
    "shareWeight" DOUBLE PRECISION,
    "fixedAmount" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "revenue_shares_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "royalty_beneficiaries" (
    "id" UUID NOT NULL,
    "entitlementId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "beneficiaryType" VARCHAR(32) NOT NULL,
    "beneficiaryEntityId" VARCHAR(64),
    "name" TEXT NOT NULL,
    "role" VARCHAR(64) NOT NULL DEFAULT 'beneficiary',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "royalty_beneficiaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "royalty_ownership" (
    "id" UUID NOT NULL,
    "entitlementId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "role" VARCHAR(32) NOT NULL,
    "partyType" VARCHAR(32),
    "partyEntityId" VARCHAR(64),
    "name" TEXT NOT NULL,
    "effectiveDate" DATE,
    "endDate" DATE,
    "reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "royalty_ownership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "entitlement_restrictions" (
    "id" UUID NOT NULL,
    "entitlementId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "restrictionType" VARCHAR(64) NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "effectiveDate" DATE,
    "expirationDate" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entitlement_restrictions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "entitlement_promotion_manifests" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "rightId" UUID NOT NULL,
    "rightVersion" INTEGER,
    "contractId" INTEGER,
    "verifiedContractId" UUID,
    "verifiedVersion" INTEGER,
    "status" VARCHAR(32) NOT NULL DEFAULT 'running',
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdBy" INTEGER,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entitlement_promotion_manifests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "entitlement_candidates" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "promotionManifestId" UUID NOT NULL,
    "rightId" UUID NOT NULL,
    "rightVersion" INTEGER,
    "contractId" INTEGER,
    "verifiedContractId" UUID,
    "verifiedVersion" INTEGER,
    "revenueCategory" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "proposedPayload" JSONB NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "decisionNotes" TEXT,
    "decidedBy" INTEGER,
    "decidedAt" TIMESTAMPTZ(6),
    "resultingEntitlementId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entitlement_candidates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "entitlement_history" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "entitlementId" UUID NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "actorUserId" INTEGER,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entitlement_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "entitlement_timeline_entries" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "entitlementId" UUID NOT NULL,
    "entryType" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "actorUserId" INTEGER,
    "payload" JSONB,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entitlement_timeline_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "royalty_entitlement_events" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "entitlementId" UUID,
    "eventType" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "royalty_entitlement_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_royalty_entitlements_org_status" ON "royalty_entitlements"("organizationId", "status");
CREATE INDEX "ix_royalty_entitlements_right" ON "royalty_entitlements"("rightId");
CREATE INDEX "ix_royalty_entitlements_category" ON "royalty_entitlements"("revenueCategory");
CREATE INDEX "ix_royalty_entitlements_expiration" ON "royalty_entitlements"("expirationDate");
CREATE INDEX "ix_royalty_allocations_entitlement" ON "royalty_allocations"("entitlementId");
CREATE INDEX "ix_revenue_shares_allocation" ON "revenue_shares"("allocationId");
CREATE INDEX "ix_royalty_beneficiaries_entitlement" ON "royalty_beneficiaries"("entitlementId");
CREATE INDEX "ix_royalty_ownership_entitlement" ON "royalty_ownership"("entitlementId");
CREATE INDEX "ix_entitlement_restrictions_entitlement" ON "entitlement_restrictions"("entitlementId");
CREATE INDEX "ix_entitlement_manifests_org" ON "entitlement_promotion_manifests"("organizationId");
CREATE INDEX "ix_entitlement_manifests_right" ON "entitlement_promotion_manifests"("rightId");
CREATE INDEX "ix_entitlement_candidates_org_status" ON "entitlement_candidates"("organizationId", "status");
CREATE INDEX "ix_entitlement_candidates_right" ON "entitlement_candidates"("rightId");
CREATE INDEX "ix_entitlement_candidates_manifest" ON "entitlement_candidates"("promotionManifestId");
CREATE INDEX "ix_entitlement_history_entitlement" ON "entitlement_history"("entitlementId");
CREATE INDEX "ix_entitlement_timeline_entitlement" ON "entitlement_timeline_entries"("entitlementId", "occurredAt");
CREATE INDEX "ix_royalty_entitlement_events_org" ON "royalty_entitlement_events"("organizationId");
CREATE INDEX "ix_royalty_entitlement_events_entitlement" ON "royalty_entitlement_events"("entitlementId");
CREATE INDEX "ix_royalty_entitlement_events_type" ON "royalty_entitlement_events"("eventType");

ALTER TABLE "royalty_allocations" ADD CONSTRAINT "royalty_allocations_entitlementId_fkey"
  FOREIGN KEY ("entitlementId") REFERENCES "royalty_entitlements"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "revenue_shares" ADD CONSTRAINT "revenue_shares_allocationId_fkey"
  FOREIGN KEY ("allocationId") REFERENCES "royalty_allocations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "royalty_beneficiaries" ADD CONSTRAINT "royalty_beneficiaries_entitlementId_fkey"
  FOREIGN KEY ("entitlementId") REFERENCES "royalty_entitlements"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "royalty_ownership" ADD CONSTRAINT "royalty_ownership_entitlementId_fkey"
  FOREIGN KEY ("entitlementId") REFERENCES "royalty_entitlements"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "entitlement_restrictions" ADD CONSTRAINT "entitlement_restrictions_entitlementId_fkey"
  FOREIGN KEY ("entitlementId") REFERENCES "royalty_entitlements"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "entitlement_candidates" ADD CONSTRAINT "entitlement_candidates_promotionManifestId_fkey"
  FOREIGN KEY ("promotionManifestId") REFERENCES "entitlement_promotion_manifests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "entitlement_history" ADD CONSTRAINT "entitlement_history_entitlementId_fkey"
  FOREIGN KEY ("entitlementId") REFERENCES "royalty_entitlements"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "entitlement_timeline_entries" ADD CONSTRAINT "entitlement_timeline_entries_entitlementId_fkey"
  FOREIGN KEY ("entitlementId") REFERENCES "royalty_entitlements"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
