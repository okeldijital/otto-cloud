-- Contract Relationships (Milestone 4.0)

CREATE TABLE "contract_relationships" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "verifiedContractId" UUID,
    "relationshipType" VARCHAR(64) NOT NULL,
    "targetEntityType" VARCHAR(32) NOT NULL,
    "targetEntityId" VARCHAR(64) NOT NULL,
    "targetEntityName" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "source" VARCHAR(32) NOT NULL,
    "suggestionId" UUID,
    "confidence" DOUBLE PRECISION,
    "matchStrategy" VARCHAR(64),
    "reason" TEXT,
    "provenance" JSONB NOT NULL,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedBy" INTEGER,
    "removedAt" TIMESTAMPTZ(6),
    CONSTRAINT "contract_relationships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "relationship_suggestions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "verifiedContractId" UUID,
    "relationshipType" VARCHAR(64) NOT NULL,
    "targetEntityType" VARCHAR(32) NOT NULL,
    "targetEntityId" VARCHAR(64) NOT NULL,
    "targetEntityName" TEXT,
    "sourceText" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matchStrategy" VARCHAR(64) NOT NULL,
    "reason" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(6),
    "decidedBy" INTEGER,
    CONSTRAINT "relationship_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "relationship_decisions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "suggestionId" UUID NOT NULL,
    "decision" VARCHAR(32) NOT NULL,
    "actorUserId" INTEGER,
    "notes" TEXT,
    "relationshipId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "relationship_decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "relationship_history" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "relationshipId" UUID,
    "suggestionId" UUID,
    "action" VARCHAR(64) NOT NULL,
    "actorUserId" INTEGER,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "relationship_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_relationship_events" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_relationship_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_contract_relationship_target" ON "contract_relationships"("contractId", "relationshipType", "targetEntityType", "targetEntityId");
CREATE INDEX "ix_contract_relationships_org" ON "contract_relationships"("organizationId");
CREATE INDEX "ix_contract_relationships_contract" ON "contract_relationships"("contractId");
CREATE INDEX "ix_contract_relationships_target" ON "contract_relationships"("targetEntityType", "targetEntityId");
CREATE INDEX "ix_contract_relationships_status" ON "contract_relationships"("status");

CREATE INDEX "ix_relationship_suggestions_org" ON "relationship_suggestions"("organizationId");
CREATE INDEX "ix_relationship_suggestions_contract_status" ON "relationship_suggestions"("contractId", "status");
CREATE INDEX "ix_relationship_suggestions_target" ON "relationship_suggestions"("targetEntityType", "targetEntityId");

CREATE INDEX "ix_relationship_decisions_suggestion" ON "relationship_decisions"("suggestionId");
CREATE INDEX "ix_relationship_decisions_contract" ON "relationship_decisions"("contractId");

CREATE INDEX "ix_relationship_history_contract" ON "relationship_history"("contractId");
CREATE INDEX "ix_relationship_history_org" ON "relationship_history"("organizationId");
CREATE INDEX "ix_relationship_history_created" ON "relationship_history"("createdAt");

CREATE INDEX "ix_contract_rel_events_org" ON "contract_relationship_events"("organizationId");
CREATE INDEX "ix_contract_rel_events_contract" ON "contract_relationship_events"("contractId");
CREATE INDEX "ix_contract_rel_events_type" ON "contract_relationship_events"("eventType");

ALTER TABLE "relationship_decisions"
  ADD CONSTRAINT "relationship_decisions_suggestionId_fkey"
  FOREIGN KEY ("suggestionId") REFERENCES "relationship_suggestions"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
