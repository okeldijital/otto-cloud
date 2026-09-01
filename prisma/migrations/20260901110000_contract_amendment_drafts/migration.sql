-- Contract Amendment Drafts
-- Non-authoritative editable working copy. Final contract versions continue
-- through the existing document intelligence + verification pipeline.

CREATE TABLE "contract_amendment_drafts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "amendmentId" UUID NOT NULL,
    "sourceVerifiedContractId" UUID,
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "content" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_amendment_drafts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contract_amendment_drafts_amendment_fkey"
      FOREIGN KEY ("amendmentId") REFERENCES "contract_amendments"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "uq_contract_amendment_draft_amendment"
  ON "contract_amendment_drafts"("amendmentId");
CREATE INDEX "ix_contract_amendment_drafts_org"
  ON "contract_amendment_drafts"("organizationId");
CREATE INDEX "ix_contract_amendment_drafts_contract"
  ON "contract_amendment_drafts"("contractId");
CREATE INDEX "ix_contract_amendment_drafts_status"
  ON "contract_amendment_drafts"("status");
