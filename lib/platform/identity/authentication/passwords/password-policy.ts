/**
 * Password strength validation — policy values from Platform Config.
 */

import { getPlatformConfig } from "@/lib/platform/config";
import { IdentityError } from "../../domain/types";

export interface PasswordPolicyResult {
  ok: boolean;
  errors: string[];
  score: number; // 0–4
}

export function validatePasswordStrength(password: string): PasswordPolicyResult {
  const policy = getPlatformConfig().security.password;
  const errors: string[] = [];
  let score = 0;

  if (!password || password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters`);
  } else {
    score += 1;
  }

  if (policy.requireLowercase) {
    if (!/[a-z]/.test(password)) errors.push("Include a lowercase letter");
    else score += 1;
  }

  if (policy.requireUppercase) {
    if (!/[A-Z]/.test(password)) errors.push("Include an uppercase letter");
    else score += 1;
  }

  if (policy.requireNumber) {
    if (!/[0-9]/.test(password)) errors.push("Include a number");
    else score += 1;
  }

  if (policy.requireSymbol) {
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push("Include a special character");
    } else {
      score += 1;
    }
  }

  const lower = password.toLowerCase();
  if (policy.bannedSubstrings.some((w) => lower.includes(w))) {
    errors.push("Password is too common");
    score = Math.min(score, 1);
  }

  return {
    ok: errors.length === 0,
    errors,
    score: Math.min(4, score),
  };
}

export function assertPasswordStrength(password: string): void {
  const result = validatePasswordStrength(password);
  if (!result.ok) {
    throw new IdentityError(
      "Password does not meet policy",
      400,
      "PASSWORD_POLICY",
      result.errors
    );
  }
}
