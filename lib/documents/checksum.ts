import { createHash } from "crypto";

/**
 * Generate a SHA-256 hex digest for file integrity.
 * Technical metadata only — does not inspect document semantics.
 */
export function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Extract a lowercase extension including the leading dot, or null.
 */
export function extractExtension(fileName: string): string | null {
  const trimmed = (fileName || "").trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0 || dot === trimmed.length - 1) return null;
  return trimmed.slice(dot).toLowerCase();
}
