-- Commercial product licensing / entitlement foundation.
--
-- This is intentionally separate from royalty entitlements and from IAM RBAC.
-- A license is organization-scoped and can be perpetual or time-bounded.
-- Product plans represent independently licensable capability bundles.

CREATE TABLE "product_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" VARCHAR(64) NOT NULL,
  "name" VARCHAR(128) NOT NULL,
  "description" TEXT,
  "features" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_product_licenses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "product_plan_id" UUID NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'active',
  "license_type" VARCHAR(32) NOT NULL DEFAULT 'perpetual',
  "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6),
  "source" VARCHAR(64) NOT NULL DEFAULT 'manual',
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_product_licenses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_product_licenses_plan_fkey"
    FOREIGN KEY ("product_plan_id") REFERENCES "product_plans"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "organization_product_licenses_org_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "iam_organizations"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "organization_product_licenses_org_plan_key"
    UNIQUE ("organization_id", "product_plan_id")
);

CREATE UNIQUE INDEX "product_plans_key_key" ON "product_plans"("key");
CREATE INDEX "ix_product_plans_active" ON "product_plans"("active");
CREATE INDEX "ix_org_product_licenses_org" ON "organization_product_licenses"("organization_id");
CREATE INDEX "ix_org_product_licenses_status" ON "organization_product_licenses"("status");
CREATE INDEX "ix_org_product_licenses_expiry" ON "organization_product_licenses"("expires_at");

INSERT INTO "product_plans" ("key", "name", "description", "features") VALUES
  ('OTTO_CORE', 'OTTO Core', 'Base OTTO perpetual license.', '["catalog","contracts.core"]'::jsonb),
  ('OTTO_NETWORK', 'OTTO Network', 'Network and relationship management.', '["network"]'::jsonb),
  ('OTTO_RIGHTS', 'OTTO Rights', 'Advanced rights administration.', '["rights"]'::jsonb),
  ('OTTO_ROYALTIES', 'OTTO Royalties', 'Royalty and entitlement operations.', '["royalties"]'::jsonb),
  ('OTTO_OFFICE', 'OTTO Office', 'Office and reporting capabilities.', '["office"]'::jsonb),
  ('OTTO_WORKSPACE', 'OTTO Workspace', 'Release workspace capabilities.', '["workspace"]'::jsonb),
  ('OTTO_AI', 'OTTO Intelligence', 'AI capabilities.', '["ai"]'::jsonb),
  ('OTTO_CONTRACTS_OCR', 'Contracts OCR', 'OCR and contract document intelligence.', '["contracts.ocr"]'::jsonb)
ON CONFLICT ("key") DO NOTHING;

-- Bootstrap existing IAM organizations onto the Core product so the new
-- commercial gate cannot remove access from organizations that pre-date it.
INSERT INTO "organization_product_licenses" ("organization_id", "product_plan_id", "source")
SELECT o."id", p."id", 'commercial-bootstrap'
FROM "iam_organizations" o
CROSS JOIN "product_plans" p
WHERE o."status" = 'active'
  AND p."key" = 'OTTO_CORE'
ON CONFLICT ("organization_id", "product_plan_id") DO NOTHING;
