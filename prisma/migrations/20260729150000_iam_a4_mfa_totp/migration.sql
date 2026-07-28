-- A.4 TOTP MFA challenges + org MFA policy

CREATE TABLE IF NOT EXISTS "iam_mfa_challenges" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "challengeTokenHash" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" UUID,
    "ipAddress" VARCHAR(64),
    "userAgent" TEXT,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_mfa_challenges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "iam_mfa_challenges_challengeTokenHash_key"
  ON "iam_mfa_challenges"("challengeTokenHash");
CREATE INDEX IF NOT EXISTS "ix_iam_mfa_challenges_identity_status"
  ON "iam_mfa_challenges"("identityId", "status");
CREATE INDEX IF NOT EXISTS "ix_iam_mfa_challenges_expires"
  ON "iam_mfa_challenges"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "iam_mfa_challenges"
    ADD CONSTRAINT "iam_mfa_challenges_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "iam_organizations"
  ADD COLUMN IF NOT EXISTS "mfaPolicy" VARCHAR(32) NOT NULL DEFAULT 'optional';
