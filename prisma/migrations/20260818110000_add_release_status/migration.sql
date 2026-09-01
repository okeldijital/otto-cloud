ALTER TABLE "releases" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'draft';

ALTER TABLE "releases" ALTER COLUMN "status" SET DEFAULT 'draft';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'releases_status_check'
      AND conrelid = 'releases'::regclass
  ) THEN
    ALTER TABLE "releases"
      ADD CONSTRAINT "releases_status_check"
      CHECK ("status" IN ('draft', 'ready', 'scheduled', 'released'))
      NOT VALID;
  END IF;
END $$;

ALTER TABLE "releases" VALIDATE CONSTRAINT "releases_status_check";
