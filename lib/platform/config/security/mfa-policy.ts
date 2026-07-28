export interface MfaPolicyConfig {
  requiredForAdmins: boolean;
  recoveryCodeCount: number;
  trustedDeviceDays: number;
  totpIssuer: string;
}

export const DEFAULT_MFA_POLICY: MfaPolicyConfig = {
  requiredForAdmins: false,
  recoveryCodeCount: 10,
  trustedDeviceDays: 30,
  totpIssuer: "OTTO",
};

export function loadMfaPolicyFromEnv(): MfaPolicyConfig {
  const count = parseInt(process.env.SECURITY_MFA_RECOVERY_CODE_COUNT || "", 10);
  const days = parseInt(process.env.SECURITY_MFA_TRUSTED_DEVICE_DAYS || "", 10);
  return {
    ...DEFAULT_MFA_POLICY,
    requiredForAdmins:
      process.env.SECURITY_MFA_REQUIRED_FOR_ADMINS === "true",
    recoveryCodeCount:
      Number.isFinite(count) && count >= 5
        ? count
        : DEFAULT_MFA_POLICY.recoveryCodeCount,
    trustedDeviceDays:
      Number.isFinite(days) && days > 0
        ? days
        : DEFAULT_MFA_POLICY.trustedDeviceDays,
    totpIssuer: process.env.SECURITY_MFA_ISSUER || DEFAULT_MFA_POLICY.totpIssuer,
  };
}
