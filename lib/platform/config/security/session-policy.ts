export interface SessionPolicyConfig {
  maxAgeHours: number;
  idleTimeoutHours: number;
  rememberMeDays: number;
  refreshTokenDays: number;
  /** Short-lived access token lifetime (minutes) */
  accessTokenMinutes: number;
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
  sessionCookieName: "otto_sid",
  refreshCookieName: "otto_rid",
  accessCookieName: "otto_at",
  csrfCookieName: "otto_csrf",
  cookieSecure: process.env.NODE_ENV === "production",
  cookieSameSite: "lax",
};

export function loadSessionPolicyFromEnv(): SessionPolicyConfig {
  const maxAge = parseInt(process.env.SECURITY_SESSION_MAX_AGE_HOURS || "", 10);
  const idle = parseInt(process.env.SECURITY_SESSION_IDLE_TIMEOUT_HOURS || "", 10);
  const remember = parseInt(process.env.SECURITY_SESSION_REMEMBER_ME_DAYS || "", 10);
  const accessMin = parseInt(
    process.env.SECURITY_ACCESS_TOKEN_MINUTES || "",
    10
  );
  return {
    ...DEFAULT_SESSION_POLICY,
    maxAgeHours:
      Number.isFinite(maxAge) && maxAge > 0
        ? maxAge
        : DEFAULT_SESSION_POLICY.maxAgeHours,
    idleTimeoutHours:
      Number.isFinite(idle) && idle > 0
        ? idle
        : DEFAULT_SESSION_POLICY.idleTimeoutHours,
    rememberMeDays:
      Number.isFinite(remember) && remember > 0
        ? remember
        : DEFAULT_SESSION_POLICY.rememberMeDays,
    accessTokenMinutes:
      Number.isFinite(accessMin) && accessMin > 0
        ? accessMin
        : DEFAULT_SESSION_POLICY.accessTokenMinutes,
    cookieSecure:
      process.env.NODE_ENV === "production" ||
      process.env.IAM_COOKIE_SECURE === "true" ||
      process.env.SECURITY_COOKIE_SECURE === "true",
  };
}
