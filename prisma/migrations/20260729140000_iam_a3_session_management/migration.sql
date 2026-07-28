-- A.3 Session management: devices, audit, activity, risk level, trusted device foundation

CREATE TABLE IF NOT EXISTS "iam_devices" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "name" VARCHAR(255),
    "browser" VARCHAR(128),
    "os" VARCHAR(128),
    "platform" VARCHAR(64),
    "deviceType" VARCHAR(32) NOT NULL DEFAULT 'unknown',
    "userAgent" TEXT,
    "firstSeenAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fingerprintKey" VARCHAR(128),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_devices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ix_iam_devices_identity" ON "iam_devices"("identityId");
CREATE INDEX IF NOT EXISTS "ix_iam_devices_fingerprint" ON "iam_devices"("fingerprintKey");

ALTER TABLE "iam_devices"
  ADD CONSTRAINT "iam_devices_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "iam_sessions"
  ADD COLUMN IF NOT EXISTS "deviceId" UUID,
  ADD COLUMN IF NOT EXISTS "browser" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "os" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "platform" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "deviceType" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "absoluteExpiresAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "creationSource" VARCHAR(32) NOT NULL DEFAULT 'login',
  ADD COLUMN IF NOT EXISTS "riskLevel" VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN';

CREATE INDEX IF NOT EXISTS "ix_iam_sessions_device" ON "iam_sessions"("deviceId");
CREATE INDEX IF NOT EXISTS "ix_iam_sessions_risk" ON "iam_sessions"("riskLevel");

DO $$ BEGIN
  ALTER TABLE "iam_sessions"
    ADD CONSTRAINT "iam_sessions_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "iam_devices"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "iam_session_audit" (
    "id" UUID NOT NULL,
    "sessionId" UUID,
    "identityId" UUID NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "ipAddress" VARCHAR(64),
    "userAgent" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_session_audit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ix_iam_session_audit_session" ON "iam_session_audit"("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS "ix_iam_session_audit_identity" ON "iam_session_audit"("identityId", "createdAt");
CREATE INDEX IF NOT EXISTS "ix_iam_session_audit_action" ON "iam_session_audit"("action");

DO $$ BEGIN
  ALTER TABLE "iam_session_audit"
    ADD CONSTRAINT "iam_session_audit_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "iam_sessions"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "iam_session_audit"
    ADD CONSTRAINT "iam_session_audit_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "iam_session_activity" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "kind" VARCHAR(32) NOT NULL DEFAULT 'heartbeat',
    "ipAddress" VARCHAR(64),
    "path" VARCHAR(512),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_session_activity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ix_iam_session_activity_session" ON "iam_session_activity"("sessionId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "iam_session_activity"
    ADD CONSTRAINT "iam_session_activity_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "iam_sessions"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "iam_trusted_devices"
  ADD COLUMN IF NOT EXISTS "deviceId" UUID,
  ADD COLUMN IF NOT EXISTS "trusted" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "trustedAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "trustedUntil" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "ix_iam_trusted_devices_device" ON "iam_trusted_devices"("deviceId");

DO $$ BEGIN
  ALTER TABLE "iam_trusted_devices"
    ADD CONSTRAINT "iam_trusted_devices_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "iam_devices"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
