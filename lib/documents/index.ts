/**
 * Platform Document subsystem — public API.
 *
 * Business modules (Contract Center, Releases, Rights, …) depend on this
 * package for immutable document storage. They must NOT import R2/S3 SDKs.
 *
 * Relationship tables and business linking live in each module package
 * (e.g. lib/contract-center), not here.
 */

export { DocumentService, documentService } from "./services/document-service";
export {
  DocumentRepository,
  documentRepository,
} from "./repositories/document-repository";
export { sha256, extractExtension } from "./checksum";
export {
  DOCUMENT_MAX_SIZE_BYTES,
  DOCUMENT_STORAGE_FOLDER,
  DEFAULT_DOCUMENT_ALLOWED_MIME_TYPES,
  DEFAULT_DOCUMENT_ALLOWED_EXTENSIONS,
  // Compat re-exports used by older imports / tests
  CONTRACT_DOCUMENT_ALLOWED_MIME_TYPES,
  CONTRACT_DOCUMENT_ALLOWED_EXTENSIONS,
  DEFAULT_CONTRACT_RELATIONSHIP_TYPE,
} from "./constants";
export type { StorageProvider, StorageObject } from "./types/storage";
export {
  CloudflareR2Provider,
  getCloudflareR2Provider,
  setDefaultStorageProvider,
} from "./providers/cloudflare-r2";
export { DocumentServiceError } from "./types/errors";
export { validateDocumentUpload } from "./validation/upload-validation";
export { emitPlatformDocumentEvent } from "./events/document-events";
export type { PlatformDocumentEvent } from "./events/document-events";

export type {
  DocumentMetadata,
  DocumentMetadataDto,
  DocumentRecord,
  UploadDocumentRequest,
  UploadDocumentResponse,
  SoftDeleteDocumentRequest,
} from "./dto/document.dto";
