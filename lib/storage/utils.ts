import { v4 as uuidv4 } from "uuid";
import { DEFAULT_KEY_PREFIX, MAX_FILENAME_LENGTH, SUPPORTED_FILE_TYPES } from "./constants";
import type { FileCategory } from "./constants";

/**
 * Build a storage key for an uploaded object.
 *
 * Format: `organizations/{organizationId}/{folder}/{uuid}-{filename}`
 *
 * UUIDs (not timestamps) keep keys unique and avoid collisions when the
 * same filename is uploaded multiple times. The original filename is kept
 * for human readability and downstream retrieval.
 */
export function generateStorageKey(params: {
  organizationId: string;
  folder: string;
  fileName: string;
  uuid?: string;
}): string {
  const { organizationId, folder, fileName, uuid } = params;
  const id = uuid ?? uuidv4();
  const safeName = sanitizeFilename(fileName);
  const segment = `${id}-${safeName}`;
  return [DEFAULT_KEY_PREFIX, organizationId, folder, segment].join("/");
}

/**
 * Strip a filename of characters that are unsafe in storage keys / URLs
 * and cap its length. Preserves the extension and uses underscores for
 * separators so the result remains filesystem- and S3-safe.
 */
export function sanitizeFilename(fileName: string): string {
  const trimmed = (fileName || "file").trim();
  const dotIndex = trimmed.lastIndexOf(".");
  const hasExt = dotIndex > 0 && dotIndex < trimmed.length - 1;
  const base = hasExt ? trimmed.slice(0, dotIndex) : trimmed;
  const ext = hasExt ? trimmed.slice(dotIndex) : "";

  const safeBase = base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");

  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "").toLowerCase();

  let result = `${safeBase}${safeExt}`;
  if (result.length > MAX_FILENAME_LENGTH) {
    const extLen = safeExt.length;
    const allowed = MAX_FILENAME_LENGTH - extLen;
    result = `${result.slice(0, Math.max(1, allowed))}${safeExt}`;
  }

  return result || "file";
}

/**
 * Map a MIME type to a coarse category used by future features
 * (image optimisation, audio transcoding, OCR, thumbnails, ...).
 * Returns `"other"` when the type is unrecognised.
 */
export function detectMimeCategory(mimeType: string): FileCategory | "other" {
  for (const category of Object.keys(SUPPORTED_FILE_TYPES) as FileCategory[]) {
    if ((SUPPORTED_FILE_TYPES[category] as readonly string[]).includes(mimeType)) {
      return category;
    }
  }
  return "other";
}

/**
 * Format a byte count into a human-readable string.
 * e.g. `formatFileSize(1536)` => `"1.5 KB"`.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"] as const;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = unitIndex === 0 ? value : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}
