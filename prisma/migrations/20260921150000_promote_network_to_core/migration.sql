ALTER TABLE "organizations" ADD COLUMN "contact_person" VARCHAR(255);
ALTER TABLE "organizations" ADD COLUMN "contact_email" VARCHAR(255);
ALTER TABLE "organizations" ADD COLUMN "contact_phone" VARCHAR(50);

UPDATE "product_plans"
SET "features" = '["catalog","contracts.core","documents","network"]'::jsonb
WHERE "key" = 'OTTO_CORE';

UPDATE "product_plans"
SET "active" = false
WHERE "key" = 'OTTO_NETWORK';
