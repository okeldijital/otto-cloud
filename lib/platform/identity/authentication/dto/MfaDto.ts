/**
 * MFA DTOs (A.4)
 */

export type MfaStatusDto = {
  enabled: boolean;
  enrolledAt: string | null;
  lastUsedAt: string | null;
  recoveryCodesRemaining: number;
  trustedDeviceCount: number;
  policy: {
    orgMode: string;
    required: boolean;
    challengeTtlSeconds: number;
    recoveryCodeCount: number;
    trustedDeviceDays: number;
  };
};

export type MfaEnrollStartDto = {
  credentialId: string;
  secret: string;
  otpauthUrl: string;
  /** Optional data URL for QR — client may render otpauthUrl as QR */
  qrPayload: string;
};

export type MfaEnrollConfirmDto = {
  success: boolean;
  recoveryCodes: string[];
  warning: string;
};

export type MfaChallengeDto = {
  challengeId: string;
  mfaToken: string;
  expiresAt: string;
  methods: ("totp" | "recovery")[];
};

export type LoginNextStep =
  | "authenticated"
  | "mfa_required"
  | "password_reset_required"
  | "email_verification_required"
  | "account_locked";

export type TrustedDeviceDto = {
  id: string;
  label: string | null;
  trusted: boolean;
  trustedAt: string | null;
  trustedUntil: string | null;
  lastUsedAt: string | null;
  expiresAt: string;
  userAgent: string | null;
};
