-- Contracts and folders are now owned by the IAM organization UUID.
-- Existing contract rows on legacy organization_id=1 are the imported M2KR
-- contract set and are explicitly backfilled to the M2KR organization.
ALTER TABLE "contract_folders"
  ADD COLUMN "tenant_id" UUID;

ALTER TABLE "contract_folder_memberships"
  ADD COLUMN "tenant_id" UUID;

UPDATE "contracts"
SET "tenant_id" = '6e3b659b-f14e-484e-8ee4-a020cd4c502a'::uuid
WHERE "tenant_id" IS NULL
  AND "organization_id" = 1;

UPDATE "contract_folders"
SET "tenant_id" = '6e3b659b-f14e-484e-8ee4-a020cd4c502a'::uuid
WHERE "tenant_id" IS NULL
  AND "organization_id" = 1;

UPDATE "contract_folder_memberships" m
SET "tenant_id" = f."tenant_id"
FROM "contract_folders" f
WHERE m."folder_id" = f."id"
  AND m."tenant_id" IS NULL;

ALTER TABLE "contracts"
  ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "contract_folders"
  ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "contract_folder_memberships"
  ALTER COLUMN "tenant_id" SET NOT NULL;

DROP INDEX IF EXISTS "uq_contract_folders_org_name";
CREATE UNIQUE INDEX "uq_contract_folders_tenant_name"
  ON "contract_folders"("tenant_id", "name");

CREATE INDEX IF NOT EXISTS "ix_contracts_tenant_id"
  ON "contracts"("tenant_id");

CREATE INDEX IF NOT EXISTS "ix_contract_folders_tenant"
  ON "contract_folders"("tenant_id");

CREATE INDEX IF NOT EXISTS "ix_contract_folder_memberships_tenant_folder"
  ON "contract_folder_memberships"("tenant_id", "folder_id");

CREATE INDEX IF NOT EXISTS "ix_contract_folder_memberships_tenant_contract"
  ON "contract_folder_memberships"("tenant_id", "contract_id");
