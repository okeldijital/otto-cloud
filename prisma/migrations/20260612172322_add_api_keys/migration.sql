-- CreateTable
CREATE TABLE "api_keys" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "prefix" VARCHAR(10) NOT NULL,
    "key_hash" VARCHAR(128) NOT NULL,
    "key_last_four" VARCHAR(4) NOT NULL,
    "scopes" VARCHAR(500),
    "rate_limit" INTEGER DEFAULT 100,
    "last_used_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_api_keys_organization_id" ON "api_keys"("organization_id");

-- CreateIndex
CREATE INDEX "ix_api_keys_prefix" ON "api_keys"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "uq_api_keys_prefix_hash" ON "api_keys"("prefix", "key_hash");
