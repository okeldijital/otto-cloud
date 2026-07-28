export interface LockoutPolicyConfig {
  maxAttempts: number;
  durationMinutes: number;
  loginRateLimitPerMinute: number;
}

/** A.1 example policy: 5 failures → 15 minute temporary lock */
export const DEFAULT_LOCKOUT_POLICY: LockoutPolicyConfig = {
  maxAttempts: 5,
  durationMinutes: 15,
  loginRateLimitPerMinute: 10,
};

export function loadLockoutPolicyFromEnv(): LockoutPolicyConfig {
  const max = parseInt(process.env.SECURITY_LOCKOUT_MAX_ATTEMPTS || "", 10);
  const dur = parseInt(process.env.SECURITY_LOCKOUT_DURATION_MINUTES || "", 10);
  const rate = parseInt(process.env.SECURITY_LOGIN_RATE_LIMIT_PER_MINUTE || "", 10);
  return {
    maxAttempts:
      Number.isFinite(max) && max > 0 ? max : DEFAULT_LOCKOUT_POLICY.maxAttempts,
    durationMinutes:
      Number.isFinite(dur) && dur > 0
        ? dur
        : DEFAULT_LOCKOUT_POLICY.durationMinutes,
    loginRateLimitPerMinute:
      Number.isFinite(rate) && rate > 0
        ? rate
        : DEFAULT_LOCKOUT_POLICY.loginRateLimitPerMinute,
  };
}
