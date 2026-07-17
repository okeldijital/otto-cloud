import type { FileCategory } from "./constants";

/**
 * Strongly-typed contracts for the Otto Storage Service.
 *
 * Application modules depend only on these interfaces and the functions in
 * `lib/storage`, never on the underlying provider (Cloudflare R2).
 */

/**
 * Common options shared by operations that reference a stored object.
 */
export interface StorageObjectRef {
  /** Storage key (full object key inside the bucket). */
  key: string;
  /** Optional bucket override; defaults to the configured bucket. */
  bucket?: string;
}

/**
 * Options for {@link uploadFile}.
 */
export interface UploadFileOptions {
  /** Raw file contents. */
  body: Buffer;
  /**
   * Organization the attachment belongs to. Used to scope storage keys.
   * Required to enforce the `organizations/{orgId}/{folder}/...` layout.
   */
  organizationId: string;
  /**
   * Logical folder within the organization (e.g. "contracts", "releases").
   * Should map to one of the canonical folder names, but any string is allowed.
   */
  folder: string;
  /** Original filename, preserved for human readability and later retrieval. */
  fileName: string;
  /** MIME type of the content. */
  mimeType: string;
  /** Optional explicit storage key. When omitted a UUID-based key is generated. */
  key?: string;
  /** Optional content disposition; defaults to "inline". */
  contentDisposition?: "inline" | "attachment";
  /** Optional metadata attached to the object. */
  metadata?: Record<string, string>;
  /**
   * Optional size limit override (bytes). Falls back to the configured
   * maximum when omitted.
   */
  maxSizeBytes?: number;
}

/**
 * Result returned from a successful {@link uploadFile} call.
 *
 * Mirrors the fields of the future `Attachment` Prisma model so callers can
 * persist results without transformation.
 */
export interface UploadResult {
  /** Full storage key inside the bucket. */
  key: string;
  /** Bucket the object was written to. */
  bucket: string;
  /** Original filename, sanitised. */
  fileName: string;
  /** MIME type as stored. */
  mimeType: string;
  /** Byte size of the uploaded content. */
  fileSize: number;
  /** Version id when bucket versioning is enabled (may be undefined). */
  versionId?: string;
  /** ETag returned by the provider. */
  etag?: string;
  /** Signed URL builder hint: category derived from the MIME type. */
  category: FileCategory | "other";
  /** Absolute public URL when a public base URL is configured. */
  url?: string;
}

/**
 * Result returned from {@link deleteFile}.
 */
export interface DeleteResult {
  /** The key that was requested for deletion. */
  key: string;
  /** Whether the object existed and was deleted (or already absent). */
  success: boolean;
}

/**
 * Result returned from signed URL operations.
 */
export interface SignedUrlResult {
  /** The signed URL. */
  url: string;
  /** Storage key the URL grants access to. */
  key: string;
  /** Expiry in seconds used to generate the URL. */
  expiresIn: number;
}

/**
 * Metadata describing a stored attachment.
 *
 * This is the universal shape every business entity will reference once the
 * `Attachment` model lands in Prisma. Keeping it here lets consumers build
 * attachment rows today without a schema migration.
 */
export interface AttachmentMetadata {
  id?: string;
  organizationId: string;
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  bucket: string;
  category: FileCategory | "other";
  uploadedBy?: string;
  createdAt?: Date;
}
