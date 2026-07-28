/**
 * Platform feature flags (centralized).
 */

export interface FeatureFlags {
  /** IAM native auth is the only path after cutover */
  iamNativeAuth: boolean;
  /** When true, MFA enrollment is offered */
  iamMfa: boolean;
  /**
   * @deprecated NextAuth removed. Always false.
   * Kept for config compatibility only.
   */
  legacyNextAuth: boolean;
}

export function loadFeatureFlags(
  env: NodeJS.ProcessEnv = process.env
): FeatureFlags {
  return {
    iamNativeAuth: env.FEATURE_IAM_NATIVE_AUTH !== "false",
    iamMfa: env.FEATURE_IAM_MFA !== "false",
    legacyNextAuth: false,
  };
}
