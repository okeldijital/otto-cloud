/**
 * Platform document constants (technical metadata only).
 * No business-module policy here — modules pass allow-lists into upload.
 */

/** Default maximum size for platform document uploads (50 MB). */
export const DOCUMENT_MAX_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Default allowed MIME types for generic platform uploads.
 * Business modules (e.g. Contract Center) may pass a stricter allow-list.
 */
export const DEFAULT_DOCUMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "text/plain",
] as const;

/** Default allowed extensions (leading dot). */
export const DEFAULT_DOCUMENT_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
  ".txt",
] as const;

/** Storage folder segment under organizations/{orgId}/… */
export const DOCUMENT_STORAGE_FOLDER = "documents";

/**
 * Contract Center policy (re-exported for convenience of contract-center module).
 * Prefer importing from @/lib/contract-center for contract-only code.
 */
export const CONTRACT_DOCUMENT_ALLOWED_MIME_TYPES = ["application/pdf"] as const;
export const CONTRACT_DOCUMENT_ALLOWED_EXTENSIONS = [".pdf"] as const;
export const DEFAULT_CONTRACT_RELATIONSHIP_TYPE = "signed_agreement";
