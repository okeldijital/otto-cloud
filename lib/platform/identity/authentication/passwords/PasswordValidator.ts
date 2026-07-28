/**
 * PasswordValidator — structured policy checks (A.2).
 */

import type { PasswordPolicyConfig } from "@/lib/platform/config";
import { passwordPolicyService } from "../policies/PasswordPolicyService";
import { IdentityError } from "../../domain/types";

export type PasswordValidationIssue = {
  code: string;
  message: string;
};

export type PasswordValidationResult = {
  ok: boolean;
  errors: PasswordValidationIssue[];
  entropy: number;
  score: number;
};

/**
 * Approximate Shannon entropy of the password string.
 */
export function estimateEntropy(password: string): number {
  if (!password) return 0;
  const freq = new Map<string, number>();
  for (const ch of password) {
    freq.set(ch, (freq.get(ch) || 0) + 1);
  }
  let entropy = 0;
  const len = password.length;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  // Scale by length for total bits estimate
  return entropy * len;
}

export class PasswordValidator {
  validate(
    password: string,
    policy?: PasswordPolicyConfig
  ): PasswordValidationResult {
    const p = policy ?? passwordPolicyService.getPolicy();
    const errors: PasswordValidationIssue[] = [];
    let score = 0;

    if (!password || password.length < p.minimumLength) {
      errors.push({
        code: "MIN_LENGTH",
        message: `Password must be at least ${p.minimumLength} characters`,
      });
    } else {
      score += 1;
    }

    if (password && password.length > p.maximumLength) {
      errors.push({
        code: "MAX_LENGTH",
        message: `Password must be at most ${p.maximumLength} characters`,
      });
    }

    if (p.requireLowercase) {
      if (!/[a-z]/.test(password || "")) {
        errors.push({
          code: "REQUIRE_LOWERCASE",
          message: "Include a lowercase letter",
        });
      } else score += 1;
    }

    if (p.requireUppercase) {
      if (!/[A-Z]/.test(password || "")) {
        errors.push({
          code: "REQUIRE_UPPERCASE",
          message: "Include an uppercase letter",
        });
      } else score += 1;
    }

    if (p.requireNumbers) {
      if (!/[0-9]/.test(password || "")) {
        errors.push({
          code: "REQUIRE_NUMBER",
          message: "Include a number",
        });
      } else score += 1;
    }

    if (p.requireSymbols) {
      if (!/[^A-Za-z0-9]/.test(password || "")) {
        errors.push({
          code: "REQUIRE_SYMBOL",
          message: "Include a special character",
        });
      } else score += 1;
    }

    const entropy = estimateEntropy(password || "");
    if (p.minimumEntropy > 0 && entropy < p.minimumEntropy) {
      errors.push({
        code: "MIN_ENTROPY",
        message: "Password is too predictable; choose a stronger phrase",
      });
    } else if (p.minimumEntropy > 0) {
      score += 1;
    }

    const lower = (password || "").toLowerCase();
    if (p.bannedSubstrings.some((w) => lower.includes(w))) {
      errors.push({
        code: "BANNED_PATTERN",
        message: "Password is too common",
      });
      score = Math.min(score, 1);
    }

    return {
      ok: errors.length === 0,
      errors,
      entropy,
      score: Math.min(5, score),
    };
  }

  assertValid(password: string, policy?: PasswordPolicyConfig): void {
    const result = this.validate(password, policy);
    if (!result.ok) {
      throw new IdentityError(
        "Password does not meet policy",
        400,
        "PASSWORD_POLICY",
        result.errors.map((e) => e.message)
      );
    }
  }
}

export const passwordValidator = new PasswordValidator();
