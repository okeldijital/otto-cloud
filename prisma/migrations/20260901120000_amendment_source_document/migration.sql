-- Amendment source-document lineage.
-- The amendment PDF is stored as a normal immutable Contract Document;
-- this pointer identifies which document is the amendment's submitted source.
ALTER TABLE "contract_amendment_drafts"
  ADD COLUMN "sourceDocumentId" UUID;

CREATE INDEX "ix_contract_amendment_drafts_source_document"
  ON "contract_amendment_drafts"("sourceDocumentId");
