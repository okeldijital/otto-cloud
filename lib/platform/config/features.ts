/**
 * Platform feature flags (centralized).
 */

export interface FeatureFlags {
  /** When true, new IAM login is available (A.1+) */
  iamNativeAuth: boolean;
  /** When true, MFA enrollment is offered */
  iamMfa: boolean;
  /** When true, dual-run legacy next-auth remains default login */
  legacyNextAuth: boolean;
}

export function loadFeatureFlags(
  env: NodeJS.ProcessEnv = process.env
): FeatureFlags {
  return {
    iamNativeAuth: env.FEATURE_IAM_NATIVE_AUTH === "true",
    iamMfa: env.FEATURE_IAM_MFA === "true",
    /** Default true until cutover */
    legacyNextAuth: env.FEATURE_LEGACY_NEXT_AUTH !== "false",
  };
}
