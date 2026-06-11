-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "advanced_contracts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ai_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "max_storage_mb" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "max_team_members" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "reports_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripe_price_id" VARCHAR(255);
