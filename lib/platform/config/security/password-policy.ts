/**
 * Central password policy — owned by Platform Config, not scattered services.
 */

export interface PasswordPolicyConfig {
  minLength: number;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
  algorithm: "argon2id";
  /** Optional: reject passwords containing these substrings (lowercase) */
  bannedSubstrings: string[];
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicyConfig = {
  minLength: 12,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSymbol: true,
  algorithm: "argon2id",
  bannedSubstrings: ["password", "password123", "123456789012", "qwertyuiopas"],
};

export function loadPasswordPolicyFromEnv(): PasswordPolicyConfig {
  const min = parseInt(process.env.SECURITY_PASSWORD_MIN_LENGTH || "", 10);
  return {
    ...DEFAULT_PASSWORD_POLICY,
    minLength:
      Number.isFinite(min) && min >= 8 ? min : DEFAULT_PASSWORD_POLICY.minLength,
    requireSymbol:
      process.env.SECURITY_PASSWORD_REQUIRE_SYMBOLS !== "false",
  };
}
