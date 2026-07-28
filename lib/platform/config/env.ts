/**
 * Environment validation for platform packages.
 * Fails soft in development; lists missing production requirements.
 */

export interface EnvValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePlatformEnv(
  env: NodeJS.ProcessEnv = process.env
): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = env.NODE_ENV === "production";

  if (isProd) {
    if (!env.IAM_ENCRYPTION_KEY && !env.NEXTAUTH_SECRET) {
      errors.push(
        "IAM_ENCRYPTION_KEY (or NEXTAUTH_SECRET bridge) required in production"
      );
    }
    if (!env.DATABASE_URL) {
      errors.push("DATABASE_URL is required");
    }
  } else {
    if (!env.IAM_ENCRYPTION_KEY) {
      warnings.push(
        "IAM_ENCRYPTION_KEY not set — using derived dev key for secret-box"
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function assertPlatformEnvForProduction(): void {
  if (process.env.NODE_ENV !== "production") return;
  const result = validatePlatformEnv();
  if (!result.ok) {
    throw new Error(
      `Platform env validation failed:\n${result.errors.join("\n")}`
    );
  }
}
