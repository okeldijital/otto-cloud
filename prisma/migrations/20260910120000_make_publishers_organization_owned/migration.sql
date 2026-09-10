-- Publisher records were previously global reference data.
-- Existing rows are retained under the legacy/default organization scope.
ALTER TABLE "publishers"
  ADD COLUMN "organization_id" UUID;

UPDATE "publishers"
SET "organization_id" = '00000000-0000-0000-0000-000000000001'::uuid
WHERE "organization_id" IS NULL;

ALTER TABLE "publishers"
  ALTER COLUMN "organization_id" SET NOT NULL;

CREATE INDEX "ix_publishers_organization_id"
  ON "publishers"("organization_id");
