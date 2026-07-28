-- A.5 Organization membership & RBAC

ALTER TABLE "iam_organizations"
  ADD COLUMN IF NOT EXISTS "ownerIdentityId" UUID,
  ADD COLUMN IF NOT EXISTS "policies" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "roleVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "iam_organization_memberships"
  ADD COLUMN IF NOT EXISTS "isOwner" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "membershipVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "removedAt" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "ix_iam_memberships_status"
  ON "iam_organization_memberships"("status");

CREATE TABLE IF NOT EXISTS "iam_membership_audit" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "membershipId" UUID,
    "identityId" UUID,
    "actorIdentityId" UUID,
    "action" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_membership_audit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ix_iam_membership_audit_org"
  ON "iam_membership_audit"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "ix_iam_membership_audit_identity"
  ON "iam_membership_audit"("identityId");

DO $$ BEGIN
  ALTER TABLE "iam_membership_audit"
    ADD CONSTRAINT "iam_membership_audit_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "iam_organizations"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
