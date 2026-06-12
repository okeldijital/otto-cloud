-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "brand_color" VARCHAR(7) DEFAULT '#6366f1',
ADD COLUMN     "display_name" VARCHAR(255),
ADD COLUMN     "logo_url" VARCHAR(500);

-- CreateTable
CREATE TABLE "sso_providers" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "client_id" VARCHAR(255) NOT NULL,
    "client_secret" VARCHAR(500) NOT NULL,
    "issuer_url" VARCHAR(500),
    "metadata_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_sso_providers_organization_id" ON "sso_providers"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sso_providers_org_provider" ON "sso_providers"("organization_id", "provider");
