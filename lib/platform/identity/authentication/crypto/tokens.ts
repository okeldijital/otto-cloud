/**
 * Secure random token generation for sessions, resets, invitations.
 */

import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time compare of two hex digests or utf8 strings of equal length. */
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
