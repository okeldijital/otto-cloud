/**
 * Platform MFA policy defaults (A.4).
 * Organization-level policy lives on iam_organizations.mfaPolicy.
 */

export type OrgMfaPolicyMode =
  | "disabled"
  | "optional"
  | "required_admins"
  | "required_owners"
  | "required_all";

export interface MfaPolicyConfig {
  /** Global default org mode when org has no override semantics */
  defaultOrgMode: OrgMfaPolicyMode;
  requiredForAdmins: boolean;
  recoveryCodeCount: number;
  trustedDeviceDays: number;
  totpIssuer: string;
  /** Challenge TTL in seconds */
  challengeTtlSeconds: number;
  /** Max TOTP attempts per challenge */
  challengeMaxAttempts: number;
  /** Totp time window (steps) */
  totpWindow: number;
  /** Require password re-entry before enroll/disable */
  requireReauthSeconds: number;
}

export const DEFAULT_MFA_POLICY: MfaPolicyConfig = {
  defaultOrgMode: "optional",
  requiredForAdmins: false,
  recoveryCodeCount: 10,
  trustedDeviceDays: 30,
  totpIssuer: "OTTO",
  challengeTtlSeconds: 300,
  challengeMaxAttempts: 5,
  totpWindow: 1,
  requireReauthSeconds: 300,
};

function pos(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw || "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadMfaPolicyFromEnv(): MfaPolicyConfig {
  return {
    ...DEFAULT_MFA_POLICY,
    requiredForAdmins:
      process.env.SECURITY_MFA_REQUIRED_FOR_ADMINS === "true",
    recoveryCodeCount: pos(
      process.env.SECURITY_MFA_RECOVERY_CODE_COUNT,
      DEFAULT_MFA_POLICY.recoveryCodeCount
    ),
    trustedDeviceDays: pos(
      process.env.SECURITY_MFA_TRUSTED_DEVICE_DAYS,
      DEFAULT_MFA_POLICY.trustedDeviceDays
    ),
    totpIssuer: process.env.SECURITY_MFA_ISSUER || DEFAULT_MFA_POLICY.totpIssuer,
    challengeTtlSeconds: pos(
      process.env.SECURITY_MFA_CHALLENGE_TTL_SECONDS,
      DEFAULT_MFA_POLICY.challengeTtlSeconds
    ),
    challengeMaxAttempts: pos(
      process.env.SECURITY_MFA_CHALLENGE_MAX_ATTEMPTS,
      DEFAULT_MFA_POLICY.challengeMaxAttempts
    ),
    totpWindow: pos(
      process.env.SECURITY_MFA_TOTP_WINDOW,
      DEFAULT_MFA_POLICY.totpWindow
    ),
    requireReauthSeconds: pos(
      process.env.SECURITY_MFA_REAUTH_SECONDS,
      DEFAULT_MFA_POLICY.requireReauthSeconds
    ),
    defaultOrgMode:
      (process.env.SECURITY_MFA_DEFAULT_ORG_MODE as OrgMfaPolicyMode) ||
      DEFAULT_MFA_POLICY.defaultOrgMode,
  };
}
