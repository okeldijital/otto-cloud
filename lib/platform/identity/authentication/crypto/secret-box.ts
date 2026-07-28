/**
 * Symmetric encryption for MFA secrets at rest.
 * Uses AES-256-GCM with key from IAM_ENCRYPTION_KEY (32-byte base64 or hex).
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { IdentityError } from "../../domain/types";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function resolveKey(): Buffer {
  const raw = process.env.IAM_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!raw) {
    // Dev fallback — MUST set IAM_ENCRYPTION_KEY in production
    return createHash("sha256").update("otto-iam-dev-only-key").digest();
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {
    /* fall through */
  }
  return createHash("sha256").update(raw).digest();
}

/** Returns base64(iv|tag|ciphertext) */
export function encryptSecret(plaintext: string): {
  ciphertext: string;
  keyVersion: number;
} {
  const key = resolveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, enc]).toString("base64");
  return { ciphertext: packed, keyVersion: 1 };
}

export function decryptSecret(ciphertext: string, _keyVersion = 1): string {
  try {
    const key = resolveKey();
    const buf = Buffer.from(ciphertext, "base64");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + 16);
    const data = buf.subarray(IV_LEN + 16);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    );
  } catch {
    throw new IdentityError(
      "Unable to decrypt secret",
      500,
      "SECRET_DECRYPT_FAILED"
    );
  }
}
