-- Verified Contract Domain (Milestone 3.2)

CREATE TABLE "verified_contracts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "documentId" UUID NOT NULL,
    "extractionId" UUID NOT NULL,
    "verificationSessionId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "title" TEXT,
    "documentType" VARCHAR(64),
    "referenceNumber" VARCHAR(128),
    "currency" VARCHAR(16),
    "territorySummary" TEXT,
    "termSummary" TEXT,
    "rightsSummary" TEXT,
    "obligationsSummary" TEXT,
    "effectiveDateText" TEXT,
    "expirationDateText" TEXT,
    "governingLaw" TEXT,
    "provenance" JSONB NOT NULL,
    "promotedBy" INTEGER,
    "promotedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verified_contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verified_parties" (
    "id" UUID NOT NULL,
    "verifiedContractId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" VARCHAR(128),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "provenance" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verified_parties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verified_contract_terms" (
    "id" UUID NOT NULL,
    "verifiedContractId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "termType" VARCHAR(64) NOT NULL,
    "value" TEXT NOT NULL,
    "provenance" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verified_contract_terms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verified_rights" (
    "id" UUID NOT NULL,
    "verifiedContractId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "provenance" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verified_rights_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verified_obligations" (
    "id" UUID NOT NULL,
    "verifiedContractId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "provenance" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verified_obligations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verified_territories" (
    "id" UUID NOT NULL,
    "verifiedContractId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "provenance" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verified_territories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verified_dates" (
    "id" UUID NOT NULL,
    "verifiedContractId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "dateType" VARCHAR(32) NOT NULL,
    "valueText" TEXT NOT NULL,
    "provenance" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verified_dates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verified_contract_events" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "verifiedContractId" UUID NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verified_contract_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_verified_contract_version" ON "verified_contracts"("contractId", "version");
CREATE INDEX "ix_verified_contracts_org" ON "verified_contracts"("organizationId");
CREATE INDEX "ix_verified_contracts_current" ON "verified_contracts"("contractId", "isCurrent");
CREATE INDEX "ix_verified_contracts_document" ON "verified_contracts"("documentId");
CREATE INDEX "ix_verified_contracts_session" ON "verified_contracts"("verificationSessionId");

CREATE INDEX "ix_verified_parties_contract" ON "verified_parties"("verifiedContractId");
CREATE INDEX "ix_verified_parties_org" ON "verified_parties"("organizationId");
CREATE INDEX "ix_verified_terms_contract" ON "verified_contract_terms"("verifiedContractId");
CREATE INDEX "ix_verified_rights_contract" ON "verified_rights"("verifiedContractId");
CREATE INDEX "ix_verified_obligations_contract" ON "verified_obligations"("verifiedContractId");
CREATE INDEX "ix_verified_territories_contract" ON "verified_territories"("verifiedContractId");
CREATE INDEX "ix_verified_dates_contract" ON "verified_dates"("verifiedContractId");

CREATE INDEX "ix_verified_contract_events_org" ON "verified_contract_events"("organizationId");
CREATE INDEX "ix_verified_contract_events_contract" ON "verified_contract_events"("contractId");
CREATE INDEX "ix_verified_contract_events_type" ON "verified_contract_events"("eventType");
CREATE INDEX "ix_verified_contract_events_created" ON "verified_contract_events"("createdAt");

ALTER TABLE "verified_parties"
  ADD CONSTRAINT "verified_parties_verifiedContractId_fkey"
  FOREIGN KEY ("verifiedContractId") REFERENCES "verified_contracts"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "verified_contract_terms"
  ADD CONSTRAINT "verified_contract_terms_verifiedContractId_fkey"
  FOREIGN KEY ("verifiedContractId") REFERENCES "verified_contracts"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "verified_rights"
  ADD CONSTRAINT "verified_rights_verifiedContractId_fkey"
  FOREIGN KEY ("verifiedContractId") REFERENCES "verified_contracts"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "verified_obligations"
  ADD CONSTRAINT "verified_obligations_verifiedContractId_fkey"
  FOREIGN KEY ("verifiedContractId") REFERENCES "verified_contracts"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "verified_territories"
  ADD CONSTRAINT "verified_territories_verifiedContractId_fkey"
  FOREIGN KEY ("verifiedContractId") REFERENCES "verified_contracts"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "verified_dates"
  ADD CONSTRAINT "verified_dates_verifiedContractId_fkey"
  FOREIGN KEY ("verifiedContractId") REFERENCES "verified_contracts"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
