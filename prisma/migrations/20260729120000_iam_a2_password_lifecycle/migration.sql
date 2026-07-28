-- A.2 Credential lifecycle: session versioning, force reset, history credential link

ALTER TABLE "iam_identities"
  ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "mustChangePasswordReason" VARCHAR(128);

ALTER TABLE "iam_password_history"
  ADD COLUMN IF NOT EXISTS "credentialId" UUID;

CREATE INDEX IF NOT EXISTS "ix_iam_password_history_credential"
  ON "iam_password_history"("credentialId");
