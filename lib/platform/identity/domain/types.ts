/**
 * IAM domain types — Identity Platform Foundation (A.0)
 * Authentication concerns are separate from authorization.
 */

export type IdentityStatus =
  | "pending_verification"
  | "active"
  | "disabled"
  | "locked";

export type MembershipStatus =
  | "active"
  | "invited"
  | "suspended"
  | "removed";

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";

export type CredentialType = "password" | "totp" | "webauthn" | "recovery";

export interface IdentityRecord {
  id: string;
  email: string;
  emailNormalized: string;
  emailVerifiedAt: Date | null;
  displayName: string | null;
  status: IdentityStatus;
  lockedUntil: Date | null;
  failedLoginCount: number;
  lastLoginAt: Date | null;
  legacyUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  id: string;
  identityId: string;
  sessionTokenHash: string;
  userAgent: string | null;
  deviceLabel: string | null;
  ipAddress: string | null;
  lastActivityAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  rememberMe: boolean;
  createdAt: Date;
}

export interface AuthContext {
  identityId: string;
  email: string;
  sessionId: string;
  organizationId: string | null;
  permissions: string[];
  isSuperAdmin: boolean;
}

export class IdentityError extends Error {
  status: number;
  code: string;
  details?: string[];

  constructor(
    message: string,
    status = 400,
    code = "IDENTITY_ERROR",
    details?: string[]
  ) {
    super(message);
    this.name = "IdentityError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
