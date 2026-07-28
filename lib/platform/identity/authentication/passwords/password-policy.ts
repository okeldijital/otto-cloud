/**
 * Compatibility wrappers — prefer PasswordValidator + PasswordPolicyService (A.2).
 */

import { passwordValidator } from "./PasswordValidator";
import { IdentityError } from "../../domain/types";

export interface PasswordPolicyResult {
  ok: boolean;
  errors: string[];
  score: number;
}

export function validatePasswordStrength(password: string): PasswordPolicyResult {
  const result = passwordValidator.validate(password);
  return {
    ok: result.ok,
    errors: result.errors.map((e) => e.message),
    score: result.score,
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
