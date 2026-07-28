/**
 * Password strength policy (A.2 surface; available in A.0).
 */

import { IdentityError } from "../domain/types";

export interface PasswordPolicyResult {
  ok: boolean;
  errors: string[];
  score: number; // 0–4
}

const MIN_LENGTH = 12;

export function validatePasswordStrength(password: string): PasswordPolicyResult {
  const errors: string[] = [];
  let score = 0;

  if (!password || password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters`);
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) errors.push("Include a lowercase letter");
  else score += 1;

  if (!/[A-Z]/.test(password)) errors.push("Include an uppercase letter");
  else score += 1;

  if (!/[0-9]/.test(password)) errors.push("Include a number");
  else score += 1;

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Include a special character");
  } else {
    score += 1;
  }

  // Common weak passwords (minimal list — expand in production)
  const weak = ["password", "password123", "123456789012", "qwertyuiopas"];
  if (weak.some((w) => password.toLowerCase().includes(w))) {
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
