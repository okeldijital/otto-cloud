-- Platform IAM Identity Foundation (Milestone A.0)
-- Parallel to legacy users / next-auth — do not drop legacy tables.

CREATE TABLE "iam_identities" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "emailNormalized" VARCHAR(320) NOT NULL,
    "emailVerifiedAt" TIMESTAMPTZ(6),
    "displayName" VARCHAR(255),
    "avatarUrl" VARCHAR(500),
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending_verification',
    "lockedUntil" TIMESTAMPTZ(6),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMPTZ(6),
    "legacyUserId" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_credentials" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "label" VARCHAR(128),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "disabledAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_password_credentials" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "algorithm" VARCHAR(32) NOT NULL DEFAULT 'argon2id',
    "passwordChangedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_password_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_password_history" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_password_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_mfa_credentials" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "type" VARCHAR(32) NOT NULL DEFAULT 'totp',
    "secretEncrypted" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "label" VARCHAR(128),
    "enabledAt" TIMESTAMPTZ(6),
    "disabledAt" TIMESTAMPTZ(6),
    "lastUsedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_mfa_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_recovery_codes" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_sessions" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "deviceLabel" VARCHAR(255),
    "ipAddress" VARCHAR(64),
    "lastActivityAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "revokeReason" VARCHAR(128),
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_refresh_tokens" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "rotatedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "replacedBy" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "legacyTenantId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_organization_memberships" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "roleId" UUID,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_organization_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_roles" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "key" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_permissions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_role_permissions" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    CONSTRAINT "iam_role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_invitations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "emailNormalized" VARCHAR(320) NOT NULL,
    "roleId" UUID,
    "tokenHash" TEXT NOT NULL,
    "invitedById" UUID,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_login_attempts" (
    "id" UUID NOT NULL,
    "identityId" UUID,
    "email" VARCHAR(320),
    "success" BOOLEAN NOT NULL,
    "ipAddress" VARCHAR(64),
    "userAgent" TEXT,
    "reason" VARCHAR(128),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_trusted_devices" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "deviceTokenHash" TEXT NOT NULL,
    "label" VARCHAR(255),
    "userAgent" TEXT,
    "lastUsedAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_trusted_devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_security_events" (
    "id" UUID NOT NULL,
    "identityId" UUID,
    "eventType" VARCHAR(64) NOT NULL,
    "ipAddress" VARCHAR(64),
    "userAgent" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_security_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_password_reset_tokens" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "usedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "iam_email_verification_tokens" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "usedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iam_email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "iam_identities_email_key" ON "iam_identities"("email");
CREATE UNIQUE INDEX "iam_identities_emailNormalized_key" ON "iam_identities"("emailNormalized");
CREATE UNIQUE INDEX "iam_identities_legacyUserId_key" ON "iam_identities"("legacyUserId");
CREATE INDEX "ix_iam_identities_status" ON "iam_identities"("status");

CREATE INDEX "ix_iam_credentials_identity_type" ON "iam_credentials"("identityId", "type");
CREATE UNIQUE INDEX "uq_iam_password_credential_identity" ON "iam_password_credentials"("identityId");
CREATE INDEX "ix_iam_password_history_identity" ON "iam_password_history"("identityId");
CREATE INDEX "ix_iam_mfa_credentials_identity" ON "iam_mfa_credentials"("identityId");
CREATE INDEX "ix_iam_recovery_codes_identity" ON "iam_recovery_codes"("identityId");

CREATE UNIQUE INDEX "iam_sessions_sessionTokenHash_key" ON "iam_sessions"("sessionTokenHash");
CREATE INDEX "ix_iam_sessions_identity" ON "iam_sessions"("identityId");
CREATE INDEX "ix_iam_sessions_expires" ON "iam_sessions"("expiresAt");

CREATE UNIQUE INDEX "iam_refresh_tokens_tokenHash_key" ON "iam_refresh_tokens"("tokenHash");
CREATE INDEX "ix_iam_refresh_tokens_session" ON "iam_refresh_tokens"("sessionId");
CREATE INDEX "ix_iam_refresh_tokens_identity" ON "iam_refresh_tokens"("identityId");

CREATE UNIQUE INDEX "iam_organizations_slug_key" ON "iam_organizations"("slug");
CREATE UNIQUE INDEX "iam_organizations_legacyTenantId_key" ON "iam_organizations"("legacyTenantId");

CREATE UNIQUE INDEX "uq_iam_membership" ON "iam_organization_memberships"("identityId", "organizationId");
CREATE INDEX "ix_iam_memberships_org" ON "iam_organization_memberships"("organizationId");

CREATE UNIQUE INDEX "uq_iam_role_org_key" ON "iam_roles"("organizationId", "key");
CREATE INDEX "ix_iam_roles_key" ON "iam_roles"("key");
CREATE UNIQUE INDEX "iam_permissions_key_key" ON "iam_permissions"("key");
CREATE UNIQUE INDEX "uq_iam_role_permission" ON "iam_role_permissions"("roleId", "permissionId");

CREATE UNIQUE INDEX "iam_invitations_tokenHash_key" ON "iam_invitations"("tokenHash");
CREATE INDEX "ix_iam_invitations_org_status" ON "iam_invitations"("organizationId", "status");
CREATE INDEX "ix_iam_invitations_email" ON "iam_invitations"("emailNormalized");

CREATE INDEX "ix_iam_login_attempts_identity" ON "iam_login_attempts"("identityId", "createdAt");
CREATE INDEX "ix_iam_login_attempts_email" ON "iam_login_attempts"("email", "createdAt");

CREATE UNIQUE INDEX "iam_trusted_devices_deviceTokenHash_key" ON "iam_trusted_devices"("deviceTokenHash");
CREATE INDEX "ix_iam_trusted_devices_identity" ON "iam_trusted_devices"("identityId");

CREATE INDEX "ix_iam_security_events_identity" ON "iam_security_events"("identityId", "createdAt");
CREATE INDEX "ix_iam_security_events_type" ON "iam_security_events"("eventType");

CREATE UNIQUE INDEX "iam_password_reset_tokens_tokenHash_key" ON "iam_password_reset_tokens"("tokenHash");
CREATE INDEX "ix_iam_password_reset_tokens_identity" ON "iam_password_reset_tokens"("identityId");
CREATE UNIQUE INDEX "iam_email_verification_tokens_tokenHash_key" ON "iam_email_verification_tokens"("tokenHash");
CREATE INDEX "ix_iam_email_verification_tokens_identity" ON "iam_email_verification_tokens"("identityId");

ALTER TABLE "iam_credentials" ADD CONSTRAINT "iam_credentials_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_password_credentials" ADD CONSTRAINT "iam_password_credentials_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_password_history" ADD CONSTRAINT "iam_password_history_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_mfa_credentials" ADD CONSTRAINT "iam_mfa_credentials_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_recovery_codes" ADD CONSTRAINT "iam_recovery_codes_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_sessions" ADD CONSTRAINT "iam_sessions_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_refresh_tokens" ADD CONSTRAINT "iam_refresh_tokens_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "iam_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_refresh_tokens" ADD CONSTRAINT "iam_refresh_tokens_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_organization_memberships" ADD CONSTRAINT "iam_organization_memberships_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_organization_memberships" ADD CONSTRAINT "iam_organization_memberships_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "iam_organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_organization_memberships" ADD CONSTRAINT "iam_organization_memberships_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "iam_roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "iam_roles" ADD CONSTRAINT "iam_roles_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "iam_organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_role_permissions" ADD CONSTRAINT "iam_role_permissions_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "iam_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_role_permissions" ADD CONSTRAINT "iam_role_permissions_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "iam_permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_invitations" ADD CONSTRAINT "iam_invitations_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "iam_organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_invitations" ADD CONSTRAINT "iam_invitations_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "iam_identities"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "iam_login_attempts" ADD CONSTRAINT "iam_login_attempts_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "iam_trusted_devices" ADD CONSTRAINT "iam_trusted_devices_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_security_events" ADD CONSTRAINT "iam_security_events_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "iam_password_reset_tokens" ADD CONSTRAINT "iam_password_reset_tokens_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "iam_email_verification_tokens" ADD CONSTRAINT "iam_email_verification_tokens_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "iam_identities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
