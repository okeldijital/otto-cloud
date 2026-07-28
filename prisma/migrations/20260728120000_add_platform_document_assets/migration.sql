-- Platform Document assets (immutable) + ContractDocument relationship.
-- Documents never reference business entities; relationships are separate.

CREATE TABLE "document_assets" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storageBucket" TEXT NOT NULL,
    "storageRegion" TEXT,
    "originalFilename" TEXT NOT NULL,
    "extension" TEXT,
    "mimeType" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "checksum" TEXT NOT NULL,
    "uploadedBy" INTEGER,
    "uploadedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_document_relations" (
    "id" UUID NOT NULL,
    "contractId" INTEGER NOT NULL,
    "documentId" UUID NOT NULL,
    "relationshipType" VARCHAR(50) NOT NULL DEFAULT 'signed_agreement',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,

    CONSTRAINT "contract_document_relations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_document_assets_organization" ON "document_assets"("organizationId");
CREATE INDEX "ix_document_assets_storage_key" ON "document_assets"("storageKey");
CREATE INDEX "ix_document_assets_checksum" ON "document_assets"("checksum");
CREATE INDEX "ix_document_assets_uploaded_at" ON "document_assets"("uploadedAt");

CREATE UNIQUE INDEX "uq_contract_document_relation" ON "contract_document_relations"("contractId", "documentId");
CREATE INDEX "ix_contract_document_relations_contract" ON "contract_document_relations"("contractId");
CREATE INDEX "ix_contract_document_relations_document" ON "contract_document_relations"("documentId");

ALTER TABLE "contract_document_relations"
  ADD CONSTRAINT "contract_document_relations_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "document_assets"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
