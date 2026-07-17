import { storageConfig } from "@/lib/config/storage";
import { sanitizeFilename } from "./utils";

/**
 * Validation for the Otto Storage Service.
 *
 * Centralised so every entry point (upload API, signed-upload consumers,
 * future batch importers) enforces the same rules: allowed MIME types,
 * maximum size, non-empty content, and safe filenames.
 *
 * The {@link ValidateUploadResult} shape is designed to carry a `checksum`
 * field in the future (virus scanning, dedup) without changing callers.
 */

export interface ValidateUploadInput {
  fileName: string;
  mimeType: string;
  fileSize: number;
  /** Optional checksum (e.g. sha256 hex) for future integrity checks. */
  checksum?: string;
  /** Optional per-call override of the configured maximum size, in bytes. */
  maxSizeBytes?: number;
}

export interface ValidateUploadResult {
  valid: boolean;
  errors: string[];
  /** Sanitised, storage-safe filename derived from the input. */
  sanitizedFileName: string;
}

/** Reject obviously unsafe filename characters before sanitisation. */
export function validateFilename(fileName: string): { valid: boolean; error?: string } {
  if (!fileName || typeof fileName !== "string") {
    return { valid: false, error: "Filename is required" };
  }
  const trimmed = fileName.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Filename must not be empty" };
  }
  // Block path traversal and absolute paths.
  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed === "." || trimmed === "..") {
    return { valid: false, error: "Filename contains invalid path characters" };
  }
  return { valid: true };
}

export function validateMimeType(mimeType: string): { valid: boolean; error?: string } {
  if (!mimeType || typeof mimeType !== "string") {
    return { valid: false, error: "MIME type is required" };
  }
  if (!storageConfig.allowedMimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `MIME type "${mimeType}" is not allowed`,
    };
  }
  return { valid: true };
}

export function validateFileSize(
  fileSize: number,
  maxSizeBytes: number = storageConfig.maxUploadSize
): { valid: boolean; error?: string } {
  if (!Number.isInteger(fileSize) || fileSize < 0) {
    return { valid: false, error: "File size is invalid" };
  }
  if (fileSize === 0) {
    return { valid: false, error: "File is empty" };
  }
  if (fileSize > maxSizeBytes) {
    return {
      valid: false,
      error: `File size ${fileSize} bytes exceeds maximum allowed size of ${maxSizeBytes} bytes`,
    };
  }
  return { valid: true };
}

/**
 * Run the full upload validation pipeline.
 *
 * Always returns every error encountered (does not fail fast) so callers can
 * surface a complete list to the client. The sanitised filename is included
 * for downstream use even when other checks fail.
 */
export function validateUpload(input: ValidateUploadInput): ValidateUploadResult {
  const errors: string[] = [];
  const sanitizedFileName = sanitizeFilename(input.fileName);

  const filenameCheck = validateFilename(input.fileName);
  if (!filenameCheck.valid && filenameCheck.error) errors.push(filenameCheck.error);

  const mimeCheck = validateMimeType(input.mimeType);
  if (!mimeCheck.valid && mimeCheck.error) errors.push(mimeCheck.error);

  const sizeCheck = validateFileSize(input.fileSize, input.maxSizeBytes);
  if (!sizeCheck.valid && sizeCheck.error) errors.push(sizeCheck.error);

  // Future: when a checksum is provided, verify against computed digest here.
  if (input.checksum !== undefined && typeof input.checksum !== "string") {
    errors.push("Checksum must be a string when provided");
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedFileName,
  };
}
