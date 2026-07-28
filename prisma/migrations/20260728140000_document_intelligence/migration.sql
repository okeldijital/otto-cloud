-- Document Intelligence foundation (Milestone 3.0)

CREATE TABLE "document_extraction_jobs" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "contractId" INTEGER,
    "status" VARCHAR(32) NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" TEXT,
    "errorCode" VARCHAR(64),
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdBy" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_extraction_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_extractions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "contractId" INTEGER,
    "jobId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(32) NOT NULL,
    "documentType" VARCHAR(64),
    "documentTypeConfidence" DOUBLE PRECISION,
    "ocrRequired" BOOLEAN NOT NULL DEFAULT false,
    "ocrProvider" VARCHAR(64),
    "textCharCount" INTEGER NOT NULL DEFAULT 0,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "rawText" TEXT,
    "pageBoundaries" JSONB,
    "promptVersion" VARCHAR(64) NOT NULL,
    "model" VARCHAR(128),
    "aiProvider" VARCHAR(64),
    "rawResponse" JSONB,
    "normalizedResponse" JSONB,
    "overallConfidence" DOUBLE PRECISION,
    "durationMs" INTEGER,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_extractions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "extraction_fields" (
    "id" UUID NOT NULL,
    "extractionId" UUID NOT NULL,
    "fieldKey" VARCHAR(64) NOT NULL,
    "fieldLabel" VARCHAR(128) NOT NULL,
    "value" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verificationState" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "sourceLocation" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "extraction_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification_drafts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "extractionId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "contractId" INTEGER,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "begunAt" TIMESTAMPTZ(6),
    "begunBy" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_drafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_doc_extraction_jobs_org" ON "document_extraction_jobs"("organizationId");
CREATE INDEX "ix_doc_extraction_jobs_document" ON "document_extraction_jobs"("documentId");
CREATE INDEX "ix_doc_extraction_jobs_status" ON "document_extraction_jobs"("status");
CREATE INDEX "ix_doc_extraction_jobs_contract" ON "document_extraction_jobs"("contractId");

CREATE UNIQUE INDEX "uq_document_extraction_version" ON "document_extractions"("documentId", "version");
CREATE INDEX "ix_document_extractions_org" ON "document_extractions"("organizationId");
CREATE INDEX "ix_document_extractions_document" ON "document_extractions"("documentId");
CREATE INDEX "ix_document_extractions_job" ON "document_extractions"("jobId");
CREATE INDEX "ix_document_extractions_status" ON "document_extractions"("status");

CREATE INDEX "ix_extraction_fields_extraction" ON "extraction_fields"("extractionId");
CREATE INDEX "ix_extraction_fields_key" ON "extraction_fields"("fieldKey");

CREATE UNIQUE INDEX "verification_drafts_extractionId_key" ON "verification_drafts"("extractionId");
CREATE INDEX "ix_verification_drafts_org" ON "verification_drafts"("organizationId");
CREATE INDEX "ix_verification_drafts_document" ON "verification_drafts"("documentId");

ALTER TABLE "document_extractions"
  ADD CONSTRAINT "document_extractions_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "document_extraction_jobs"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "extraction_fields"
  ADD CONSTRAINT "extraction_fields_extractionId_fkey"
  FOREIGN KEY ("extractionId") REFERENCES "document_extractions"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "verification_drafts"
  ADD CONSTRAINT "verification_drafts_extractionId_fkey"
  FOREIGN KEY ("extractionId") REFERENCES "document_extractions"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
