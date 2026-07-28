export interface TokenPolicyConfig {
  passwordResetTtlMinutes: number;
  emailVerificationTtlHours: number;
  invitationTtlDays: number;
}

export const DEFAULT_TOKEN_POLICY: TokenPolicyConfig = {
  passwordResetTtlMinutes: 60,
  emailVerificationTtlHours: 48,
  invitationTtlDays: 7,
};

export function loadTokenPolicyFromEnv(): TokenPolicyConfig {
  const reset = parseInt(process.env.SECURITY_PASSWORD_RESET_TTL_MINUTES || "", 10);
  const verify = parseInt(
    process.env.SECURITY_EMAIL_VERIFICATION_TTL_HOURS || "",
    10
  );
  const invite = parseInt(process.env.SECURITY_INVITATION_TTL_DAYS || "", 10);
  return {
    passwordResetTtlMinutes:
      Number.isFinite(reset) && reset > 0
        ? reset
        : DEFAULT_TOKEN_POLICY.passwordResetTtlMinutes,
    emailVerificationTtlHours:
      Number.isFinite(verify) && verify > 0
        ? verify
        : DEFAULT_TOKEN_POLICY.emailVerificationTtlHours,
    invitationTtlDays:
      Number.isFinite(invite) && invite > 0
        ? invite
        : DEFAULT_TOKEN_POLICY.invitationTtlDays,
  };
}
