/**
 * Session policy — owned by Platform Config (A.3).
 * No hard-coded timeouts in session services.
 */

export interface SessionPolicyConfig {
  /** Absolute session max age (hours) without remember-me */
  maxAgeHours: number;
  /** Idle timeout (hours) — inactivity ends session */
  idleTimeoutHours: number;
  rememberMeDays: number;
  refreshTokenDays: number;
  accessTokenMinutes: number;
  /** Max concurrent active sessions per identity; 0 = unlimited */
  maxConcurrentSessions: number;
  /** On logout-all, keep current session if true */
  logoutAllKeepCurrent: boolean;
  /** Show IP addresses in user session list */
  exposeIpToUser: boolean;
  /** Trusted device cookie lifetime (days) — A.4 activates trust checks */
  trustedDeviceDays: number;
  /** Cleanup archive after days revoked/expired */
  archiveAfterDays: number;
  /** Cleanup job batch size */
  cleanupBatchSize: number;

  sessionCookieName: string;
  refreshCookieName: string;
  accessCookieName: string;
  csrfCookieName: string;
  cookieSecure: boolean;
  cookieSameSite: "lax" | "strict" | "none";
}

export const DEFAULT_SESSION_POLICY: SessionPolicyConfig = {
  maxAgeHours: 12,
  idleTimeoutHours: 4,
  rememberMeDays: 30,
  refreshTokenDays: 30,
  accessTokenMinutes: 15,
  maxConcurrentSessions: 20,
  logoutAllKeepCurrent: true,
  exposeIpToUser: true,
  trustedDeviceDays: 30,
  archiveAfterDays: 90,
  cleanupBatchSize: 200,
  sessionCookieName: "otto_sid",
  refreshCookieName: "otto_rid",
  accessCookieName: "otto_at",
  csrfCookieName: "otto_csrf",
  cookieSecure: process.env.NODE_ENV === "production",
  cookieSameSite: "lax",
};

function pos(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw || "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function loadSessionPolicyFromEnv(): SessionPolicyConfig {
  return {
    ...DEFAULT_SESSION_POLICY,
    maxAgeHours: pos(
      process.env.SECURITY_SESSION_MAX_AGE_HOURS,
      DEFAULT_SESSION_POLICY.maxAgeHours
    ) || DEFAULT_SESSION_POLICY.maxAgeHours,
    idleTimeoutHours: pos(
      process.env.SECURITY_SESSION_IDLE_TIMEOUT_HOURS,
      DEFAULT_SESSION_POLICY.idleTimeoutHours
    ) || DEFAULT_SESSION_POLICY.idleTimeoutHours,
    rememberMeDays: pos(
      process.env.SECURITY_SESSION_REMEMBER_ME_DAYS,
      DEFAULT_SESSION_POLICY.rememberMeDays
    ) || DEFAULT_SESSION_POLICY.rememberMeDays,
    refreshTokenDays: pos(
      process.env.SECURITY_REFRESH_TOKEN_DAYS,
      DEFAULT_SESSION_POLICY.refreshTokenDays
    ) || DEFAULT_SESSION_POLICY.refreshTokenDays,
    accessTokenMinutes: pos(
      process.env.SECURITY_ACCESS_TOKEN_MINUTES,
      DEFAULT_SESSION_POLICY.accessTokenMinutes
    ) || DEFAULT_SESSION_POLICY.accessTokenMinutes,
    maxConcurrentSessions: pos(
      process.env.SECURITY_SESSION_MAX_CONCURRENT,
      DEFAULT_SESSION_POLICY.maxConcurrentSessions
    ),
    logoutAllKeepCurrent:
      process.env.SECURITY_LOGOUT_ALL_KEEP_CURRENT !== "false",
    exposeIpToUser: process.env.SECURITY_SESSION_EXPOSE_IP !== "false",
    trustedDeviceDays: pos(
      process.env.SECURITY_MFA_TRUSTED_DEVICE_DAYS ||
        process.env.SECURITY_TRUSTED_DEVICE_DAYS,
      DEFAULT_SESSION_POLICY.trustedDeviceDays
    ) || DEFAULT_SESSION_POLICY.trustedDeviceDays,
    archiveAfterDays: pos(
      process.env.SECURITY_SESSION_ARCHIVE_DAYS,
      DEFAULT_SESSION_POLICY.archiveAfterDays
    ) || DEFAULT_SESSION_POLICY.archiveAfterDays,
    cleanupBatchSize: pos(
      process.env.SECURITY_SESSION_CLEANUP_BATCH,
      DEFAULT_SESSION_POLICY.cleanupBatchSize
    ) || DEFAULT_SESSION_POLICY.cleanupBatchSize,
    cookieSecure:
      process.env.NODE_ENV === "production" ||
      process.env.IAM_COOKIE_SECURE === "true" ||
      process.env.SECURITY_COOKIE_SECURE === "true",
  };
}
