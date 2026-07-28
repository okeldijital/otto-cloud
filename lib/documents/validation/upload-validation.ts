import { extractExtension } from "../checksum";
import {
  DEFAULT_DOCUMENT_ALLOWED_EXTENSIONS,
  DEFAULT_DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_MAX_SIZE_BYTES,
} from "../constants";
import { DocumentServiceError } from "../types/errors";

export interface UploadValidationInput {
  fileName: string;
  mimeType: string;
  body: Buffer;
  allowedMimeTypes?: readonly string[];
  allowedExtensions?: readonly string[];
  maxSizeBytes?: number;
}

/**
 * Generic upload validation — no business-module knowledge.
 */
export function validateDocumentUpload(input: UploadValidationInput): void {
  const errors: string[] = [];
  const allowedMime =
    input.allowedMimeTypes ?? DEFAULT_DOCUMENT_ALLOWED_MIME_TYPES;
  const allowedExt =
    input.allowedExtensions ?? DEFAULT_DOCUMENT_ALLOWED_EXTENSIONS;
  const maxSize = input.maxSizeBytes ?? DOCUMENT_MAX_SIZE_BYTES;

  if (!input.body || !Buffer.isBuffer(input.body) || input.body.byteLength === 0) {
    errors.push("File is required and must not be empty");
  }
  if (!input.fileName?.trim()) {
    errors.push("Filename is required");
  } else {
    const trimmed = input.fileName.trim();
    if (trimmed.includes("/") || trimmed.includes("\\") || trimmed === "." || trimmed === "..") {
      errors.push("Filename contains invalid path characters");
    }
  }

  if (!input.mimeType) {
    errors.push("MIME type is required");
  } else if (!(allowedMime as readonly string[]).includes(input.mimeType)) {
    errors.push(
      `MIME type "${input.mimeType}" is not allowed. Allowed: ${allowedMime.join(", ")}`
    );
  }

  const ext = extractExtension(input.fileName || "");
  if (!ext || !(allowedExt as readonly string[]).includes(ext)) {
    errors.push(`Extension must be one of: ${allowedExt.join(", ")}`);
  }

  if (input.body && input.body.byteLength > maxSize) {
    errors.push(
      `File size ${input.body.byteLength} exceeds maximum of ${maxSize} bytes`
    );
  }

  if (errors.length > 0) {
    throw new DocumentServiceError("Validation failed", 400, "VALIDATION_FAILED", errors);
  }
}
