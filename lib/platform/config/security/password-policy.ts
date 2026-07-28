/**
 * Central password policy — owned by Platform Config (A.2).
 * No hard-coded values in services; read via getPlatformConfig().security.password
 */

export interface PasswordPolicyConfig {
  minimumLength: number;
  maximumLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  /** Approximate min entropy bits (Shannon-style estimate) */
  minimumEntropy: number;
  /** How many prior hashes to reject (historyDepth) */
  historyDepth: number;
  /** Max password age in days; 0 = disabled */
  maximumAgeDays: number;
  /** Min minutes before password can be changed again; 0 = no min age */
  minimumAgeMinutes: number;
  allowPasswordReuse: boolean;
  algorithm: "argon2id";
  bannedSubstrings: string[];
  /** Client-safe policy description version */
  version: number;

  /** @deprecated use minimumLength */
  minLength: number;
  /** @deprecated use requireLowercase */
  requireLowercase_compat?: boolean;
  /** @deprecated use requireUppercase */
  requireUppercase_compat?: boolean;
  /** @deprecated use requireNumbers */
  requireNumber: boolean;
  /** @deprecated use requireSymbols */
  requireSymbol: boolean;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicyConfig = {
  minimumLength: 12,
  maximumLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  minimumEntropy: 40,
  historyDepth: 5,
  maximumAgeDays: 0, // disabled by default
  minimumAgeMinutes: 0,
  allowPasswordReuse: false,
  algorithm: "argon2id",
  bannedSubstrings: ["password", "password123", "123456789012", "qwertyuiopas"],
  version: 1,
  // compat aliases
  minLength: 12,
  requireNumber: true,
  requireSymbol: true,
};

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw || "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function loadPasswordPolicyFromEnv(): PasswordPolicyConfig {
  const min = parsePositiveInt(
    process.env.SECURITY_PASSWORD_MIN_LENGTH,
    DEFAULT_PASSWORD_POLICY.minimumLength
  );
  const max = parsePositiveInt(
    process.env.SECURITY_PASSWORD_MAX_LENGTH,
    DEFAULT_PASSWORD_POLICY.maximumLength
  );
  const history = parsePositiveInt(
    process.env.SECURITY_PASSWORD_HISTORY_DEPTH,
    DEFAULT_PASSWORD_POLICY.historyDepth
  );
  const maxAge = parsePositiveInt(
    process.env.SECURITY_PASSWORD_MAX_AGE_DAYS,
    DEFAULT_PASSWORD_POLICY.maximumAgeDays
  );
  const minAge = parsePositiveInt(
    process.env.SECURITY_PASSWORD_MIN_AGE_MINUTES,
    DEFAULT_PASSWORD_POLICY.minimumAgeMinutes
  );
  const entropy = parsePositiveInt(
    process.env.SECURITY_PASSWORD_MIN_ENTROPY,
    DEFAULT_PASSWORD_POLICY.minimumEntropy
  );

  const requireSymbols =
    process.env.SECURITY_PASSWORD_REQUIRE_SYMBOLS !== "false";
  const requireNumbers =
    process.env.SECURITY_PASSWORD_REQUIRE_NUMBERS !== "false";
  const requireUpper =
    process.env.SECURITY_PASSWORD_REQUIRE_UPPERCASE !== "false";
  const requireLower =
    process.env.SECURITY_PASSWORD_REQUIRE_LOWERCASE !== "false";
  const allowReuse =
    process.env.SECURITY_PASSWORD_ALLOW_REUSE === "true";

  return {
    minimumLength: Math.max(8, min),
    maximumLength: Math.max(min, max),
    requireUppercase: requireUpper,
    requireLowercase: requireLower,
    requireNumbers,
    requireSymbols,
    minimumEntropy: entropy,
    historyDepth: history,
    maximumAgeDays: maxAge,
    minimumAgeMinutes: minAge,
    allowPasswordReuse: allowReuse,
    algorithm: "argon2id",
    bannedSubstrings: DEFAULT_PASSWORD_POLICY.bannedSubstrings,
    version: DEFAULT_PASSWORD_POLICY.version,
    minLength: Math.max(8, min),
    requireNumber: requireNumbers,
    requireSymbol: requireSymbols,
  };
}

/** Client-safe policy (no internal banned list / algorithm secrets). */
export function toClientPasswordPolicy(p: PasswordPolicyConfig) {
  return {
    minimumLength: p.minimumLength,
    maximumLength: p.maximumLength,
    requireUppercase: p.requireUppercase,
    requireLowercase: p.requireLowercase,
    requireNumbers: p.requireNumbers,
    requireSymbols: p.requireSymbols,
    minimumEntropy: p.minimumEntropy,
    historyDepth: p.historyDepth,
    maximumAgeDays: p.maximumAgeDays,
    minimumAgeMinutes: p.minimumAgeMinutes,
    allowPasswordReuse: p.allowPasswordReuse,
    version: p.version,
  };
}
