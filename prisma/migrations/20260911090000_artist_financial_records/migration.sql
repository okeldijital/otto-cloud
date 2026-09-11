-- Artist-owned operational financial records.
-- This is intentionally independent of contracts/royalties so the Artist workspace
-- remains useful while those modules are pulsed.
CREATE TABLE "artist_financial_records" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "record_type" VARCHAR(32) NOT NULL DEFAULT 'advance',
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZAR',
    "transaction_date" DATE NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "reference" VARCHAR(255),
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "artist_financial_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_artist_financial_records_org_artist"
    ON "artist_financial_records"("organization_id", "artist_id");
CREATE INDEX "ix_artist_financial_records_org_date"
    ON "artist_financial_records"("organization_id", "transaction_date");
