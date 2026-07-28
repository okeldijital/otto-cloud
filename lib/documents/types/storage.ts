/**
 * StorageProvider — provider-independent object storage interface.
 *
 * DocumentService and all business modules depend only on this interface.
 * Cloudflare R2 is one implementation; future providers must not require
 * changes to DocumentService business logic.
 */

export interface StorageUploadParams {
  key: string;
  body: Buffer;
  mimeType: string;
  metadata?: Record<string, string>;
}

export interface StorageUploadResult {
  key: string;
  bucket: string;
  region: string | null;
  provider: string;
  etag?: string;
}

export interface StorageObjectRef {
  key: string;
  bucket?: string;
}

export interface StorageObjectMetadata {
  key: string;
  bucket: string;
  contentType?: string;
  contentLength?: number;
  metadata?: Record<string, string>;
}

/** Internal storage object descriptor (never returned to clients as-is). */
export interface StorageObject {
  key: string;
  bucket: string;
  region: string | null;
  provider: string;
  etag?: string;
}

export interface StorageProvider {
  readonly name: string;

  upload(params: StorageUploadParams): Promise<StorageUploadResult>;
  download(ref: StorageObjectRef): Promise<Buffer>;
  /** Hard delete of the blob. Soft-delete of DB records is handled by DocumentService. */
  delete(ref: StorageObjectRef): Promise<void>;
  exists(ref: StorageObjectRef): Promise<boolean>;
  metadata(ref: StorageObjectRef): Promise<StorageObjectMetadata>;
  signedUrl(ref: StorageObjectRef, expiresInSeconds?: number): Promise<string>;
}
