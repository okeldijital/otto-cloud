-- Contract Lifecycle Management (Milestone 4.1)

CREATE TABLE "contract_lifecycles" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "verifiedContractId" UUID,
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "previousStatus" VARCHAR(32),
    "statusChangedAt" TIMESTAMPTZ(6),
    "statusChangedBy" INTEGER,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "renewalIntervalMonths" INTEGER,
    "noticePeriodDays" INTEGER,
    "renewalStatus" VARCHAR(32) NOT NULL DEFAULT 'none',
    "supersedesContractId" INTEGER,
    "supersededByContractId" INTEGER,
    "supersessionReason" TEXT,
    "supersessionDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_lifecycles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_key_dates" (
    "id" UUID NOT NULL,
    "lifecycleId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "dateType" VARCHAR(32) NOT NULL,
    "dateValue" DATE NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "verificationState" VARCHAR(32) NOT NULL DEFAULT 'manual',
    "source" VARCHAR(32) NOT NULL DEFAULT 'manual',
    "sourceRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_key_dates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_renewals" (
    "id" UUID NOT NULL,
    "lifecycleId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    "scheduledDate" DATE,
    "completedDate" DATE,
    "intervalMonths" INTEGER,
    "noticeDays" INTEGER,
    "notes" TEXT,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_renewals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_amendments" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "lifecycleId" UUID NOT NULL,
    "amendmentNumber" VARCHAR(64) NOT NULL,
    "effectiveDate" DATE,
    "reason" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'registered',
    "linkedVerifiedVersionId" UUID,
    "linkedVerifiedVersion" INTEGER,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_amendments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_timeline_entries" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "entryType" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "actorUserId" INTEGER,
    "payload" JSONB,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_timeline_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_lifecycle_events" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_lifecycle_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contract_lifecycles_contractId_key" ON "contract_lifecycles"("contractId");
CREATE INDEX "ix_contract_lifecycles_org" ON "contract_lifecycles"("organizationId");
CREATE INDEX "ix_contract_lifecycles_status" ON "contract_lifecycles"("status");
CREATE INDEX "ix_contract_lifecycles_renewal" ON "contract_lifecycles"("renewalStatus");

CREATE UNIQUE INDEX "uq_contract_key_date_type" ON "contract_key_dates"("lifecycleId", "dateType");
CREATE INDEX "ix_contract_key_dates_contract" ON "contract_key_dates"("contractId");
CREATE INDEX "ix_contract_key_dates_type_value" ON "contract_key_dates"("dateType", "dateValue");

CREATE INDEX "ix_contract_renewals_lifecycle" ON "contract_renewals"("lifecycleId");
CREATE INDEX "ix_contract_renewals_contract" ON "contract_renewals"("contractId");

CREATE UNIQUE INDEX "uq_contract_amendment_number" ON "contract_amendments"("contractId", "amendmentNumber");
CREATE INDEX "ix_contract_amendments_org" ON "contract_amendments"("organizationId");
CREATE INDEX "ix_contract_amendments_contract" ON "contract_amendments"("contractId");

CREATE INDEX "ix_contract_timeline_contract_time" ON "contract_timeline_entries"("contractId", "occurredAt");
CREATE INDEX "ix_contract_timeline_org" ON "contract_timeline_entries"("organizationId");
CREATE INDEX "ix_contract_timeline_type" ON "contract_timeline_entries"("entryType");

CREATE INDEX "ix_contract_lifecycle_events_org" ON "contract_lifecycle_events"("organizationId");
CREATE INDEX "ix_contract_lifecycle_events_contract" ON "contract_lifecycle_events"("contractId");
CREATE INDEX "ix_contract_lifecycle_events_type" ON "contract_lifecycle_events"("eventType");

ALTER TABLE "contract_key_dates"
  ADD CONSTRAINT "contract_key_dates_lifecycleId_fkey"
  FOREIGN KEY ("lifecycleId") REFERENCES "contract_lifecycles"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "contract_renewals"
  ADD CONSTRAINT "contract_renewals_lifecycleId_fkey"
  FOREIGN KEY ("lifecycleId") REFERENCES "contract_lifecycles"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "contract_amendments"
  ADD CONSTRAINT "contract_amendments_lifecycleId_fkey"
  FOREIGN KEY ("lifecycleId") REFERENCES "contract_lifecycles"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
