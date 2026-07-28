/**
 * Password hashing — Argon2id only (A.0 / A.1).
 * Never use bcrypt for new IAM credentials.
 */

import { hash, verify } from "@node-rs/argon2";
import { IdentityError } from "../domain/types";

/** OWASP-aligned Argon2id parameters (tune for production hardware). */
const ARGON2_OPTIONS = {
  /** Argon2id = 2 (numeric avoids ambient const enum + isolatedModules) */
  algorithm: 2 as const,
  memoryCost: 19456, // KiB ≈ 19 MiB
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 1) {
    throw new IdentityError("Password required", 400, "PASSWORD_REQUIRED");
  }
  return hash(plain, ARGON2_OPTIONS);
}

/**
 * Constant-time verification via argon2 library.
 * Returns false on any hash format error (no throw → no timing oracle on format).
 */
export async function verifyPassword(
  plain: string,
  encodedHash: string
): Promise<boolean> {
  if (!plain || !encodedHash) return false;
  try {
    return await verify(encodedHash, plain, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}

export function isArgon2idHash(encoded: string): boolean {
  return typeof encoded === "string" && encoded.startsWith("$argon2id$");
}
