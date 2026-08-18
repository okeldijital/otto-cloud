ALTER TABLE "releases" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'draft';

ALTER TABLE "releases" ADD CONSTRAINT "releases_status_check" CHECK ("status" IN ('draft', 'ready', 'scheduled', 'released')) NOT VALID;

ALTER TABLE "releases" VALIDATE CONSTRAINT "releases_status_check";
