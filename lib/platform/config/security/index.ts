import {
  DEFAULT_PASSWORD_POLICY,
  loadPasswordPolicyFromEnv,
  type PasswordPolicyConfig,
} from "./password-policy";
import {
  DEFAULT_SESSION_POLICY,
  loadSessionPolicyFromEnv,
  type SessionPolicyConfig,
} from "./session-policy";
import {
  DEFAULT_MFA_POLICY,
  loadMfaPolicyFromEnv,
  type MfaPolicyConfig,
} from "./mfa-policy";
import {
  DEFAULT_LOCKOUT_POLICY,
  loadLockoutPolicyFromEnv,
  type LockoutPolicyConfig,
} from "./lockout-policy";
import {
  DEFAULT_TOKEN_POLICY,
  loadTokenPolicyFromEnv,
  type TokenPolicyConfig,
} from "./token-policy";

export type {
  PasswordPolicyConfig,
  SessionPolicyConfig,
  MfaPolicyConfig,
  LockoutPolicyConfig,
  TokenPolicyConfig,
};

export interface SecurityConfig {
  password: PasswordPolicyConfig;
  session: SessionPolicyConfig;
  mfa: MfaPolicyConfig;
  lockout: LockoutPolicyConfig;
  tokens: TokenPolicyConfig;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  password: DEFAULT_PASSWORD_POLICY,
  session: DEFAULT_SESSION_POLICY,
  mfa: DEFAULT_MFA_POLICY,
  lockout: DEFAULT_LOCKOUT_POLICY,
  tokens: DEFAULT_TOKEN_POLICY,
};

export function loadSecurityConfig(): SecurityConfig {
  return {
    password: loadPasswordPolicyFromEnv(),
    session: loadSessionPolicyFromEnv(),
    mfa: loadMfaPolicyFromEnv(),
    lockout: loadLockoutPolicyFromEnv(),
    tokens: loadTokenPolicyFromEnv(),
  };
}

/** Flat keys for docs / feature tooling */
export const SECURITY_CONFIG_KEYS = {
  "security.password.minLength": "SECURITY_PASSWORD_MIN_LENGTH",
  "security.password.requireSymbols": "SECURITY_PASSWORD_REQUIRE_SYMBOLS",
  "security.session.maxAge": "SECURITY_SESSION_MAX_AGE_HOURS",
  "security.session.idleTimeout": "SECURITY_SESSION_IDLE_TIMEOUT_HOURS",
  "security.mfa.requiredForAdmins": "SECURITY_MFA_REQUIRED_FOR_ADMINS",
  "security.lockout.maxAttempts": "SECURITY_LOCKOUT_MAX_ATTEMPTS",
  "security.lockout.duration": "SECURITY_LOCKOUT_DURATION_MINUTES",
} as const;
