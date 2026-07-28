/**
 * IAM configuration — environment-driven defaults for A.1+ phases.
 */

export const IAM_CONFIG = {
  /** Cookie names (A.1) */
  sessionCookie: "otto_sid",
  csrfCookie: "otto_csrf",
  /** Session TTLs */
  sessionTtlHours: 12,
  rememberMeTtlDays: 30,
  refreshTtlDays: 30,
  /** Security */
  maxFailedLogins: 8,
  lockoutMinutes: 30,
  loginRateLimitPerMinute: 10,
  passwordResetTtlMinutes: 60,
  emailVerificationTtlHours: 48,
  invitationTtlDays: 7,
  recoveryCodeCount: 10,
  trustedDeviceTtlDays: 30,
  /** Algorithm label */
  passwordAlgorithm: "argon2id" as const,
} as const;

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function cookieSecureFlag(): boolean {
  return isProduction() || process.env.IAM_COOKIE_SECURE === "true";
}
