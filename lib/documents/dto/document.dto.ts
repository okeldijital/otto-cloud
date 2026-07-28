/**
 * Platform document DTOs.
 * Never expose storageKey / bucket to HTTP clients.
 */

/** Public document metadata (safe for API responses). */
export interface DocumentMetadata {
  id: string;
  originalFilename: string;
  extension: string | null;
  mimeType: string;
  fileSize: number;
  checksum: string;
  uploadedBy: number | null;
  uploadedByName?: string | null;
  uploadedAt: string;
  deletedAt: string | null;
  status: "active" | "deleted";
  storageProvider: string;
}

/** @deprecated Use DocumentMetadata — alias for gradual migration */
export type DocumentMetadataDto = DocumentMetadata;

export interface UploadDocumentRequest {
  organizationId: string;
  userId: number;
  fileName: string;
  mimeType: string;
  body: Buffer;
  /** Optional override of allowed MIME types (defaults to platform document list). */
  allowedMimeTypes?: readonly string[];
  /** Optional override of allowed extensions including leading dot. */
  allowedExtensions?: readonly string[];
  /** Optional max size override. */
  maxSizeBytes?: number;
  /** Storage folder segment under organizations/{orgId}/… */
  folder?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface UploadDocumentResponse {
  document: DocumentMetadata;
  uploadedAt: string;
  /** Internal: set when blob was written but DB create may need reconciliation. */
  storageKey?: never;
}

export interface SoftDeleteDocumentRequest {
  documentId: string;
  organizationId: string;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface DocumentRecord {
  id: string;
  organizationId: string;
  storageKey: string;
  storageProvider: string;
  storageBucket: string;
  storageRegion: string | null;
  originalFilename: string;
  extension: string | null;
  mimeType: string;
  fileSize: bigint | number;
  checksum: string;
  uploadedBy: number | null;
  uploadedAt: Date;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
