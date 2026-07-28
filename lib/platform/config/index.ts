/**
 * Platform Configuration
 *
 * Owns security policy, feature flags, and environment validation.
 * Services must read policy from here — not hard-code constants.
 */

export {
  loadSecurityConfig,
  DEFAULT_SECURITY_CONFIG,
  SECURITY_CONFIG_KEYS,
  type SecurityConfig,
  type PasswordPolicyConfig,
  type SessionPolicyConfig,
  type MfaPolicyConfig,
  type LockoutPolicyConfig,
  type TokenPolicyConfig,
} from "./security";
export {
  validatePlatformEnv,
  assertPlatformEnvForProduction,
  type EnvValidationResult,
} from "./env";
export { loadFeatureFlags, type FeatureFlags } from "./features";

import { loadSecurityConfig, type SecurityConfig } from "./security";
import { loadFeatureFlags, type FeatureFlags } from "./features";

export interface PlatformConfig {
  security: SecurityConfig;
  features: FeatureFlags;
}

let cached: PlatformConfig | null = null;

/** Cached platform config (reload via resetPlatformConfig in tests). */
export function getPlatformConfig(): PlatformConfig {
  if (!cached) {
    cached = {
      security: loadSecurityConfig(),
      features: loadFeatureFlags(),
    };
  }
  return cached;
}

export function resetPlatformConfig(): void {
  cached = null;
}

/**
 * Compatibility helper for identity package.
 * Prefer getPlatformConfig().security.
 */
export function getIamSecurityConfig(): SecurityConfig {
  return getPlatformConfig().security;
}
