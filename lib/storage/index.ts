/**
 * Otto Cloud Storage Service — public API.
 *
 * Application modules (Contracts, Releases, Artists, Songs, Workspaces,
 * Office, ...) must import from here and never from the provider directly.
 *
 * @example
 * import {
 *   uploadFile,
 *   deleteFile,
 *   getSignedDownloadUrl,
 * } from "@/lib/storage";
 */

// Configuration (re-exported for convenience; prefer importing from
// "@/lib/config/storage" when only config is needed).
export { storageConfig, allowedMimeTypes, maxUploadSize } from "@/lib/config/storage";
export type { StorageConfig, StorageProvider } from "@/lib/config/storage";

// Singleton client
export { storageClient } from "./client";
export type { StorageClient } from "./client";

// Operations
export { uploadFile } from "./upload";
export { downloadFile, getFileMetadata } from "./download";
export { deleteFile } from "./delete";
export {
  getSignedDownloadUrl,
  getSignedUploadUrl,
} from "./signed-url";

// Utilities
export {
  generateStorageKey,
  sanitizeFilename,
  detectMimeCategory,
  formatFileSize,
} from "./utils";

// Validation
export {
  validateMimeType,
  validateFileSize,
  validateFilename,
  validateUpload,
} from "./validation";
export type { ValidateUploadInput, ValidateUploadResult } from "./validation";

// Activity logging
export { logAttachmentActivity, emitAttachmentEvent } from "./activity";
export type { AttachmentEvent } from "./activity";

// Constants
export {
  DEFAULT_SIGNED_URL_EXPIRY,
  DEFAULT_FOLDER_NAMES,
  DEFAULT_KEY_PREFIX,
  MAX_UPLOAD_SIZE,
  MAX_FILENAME_LENGTH,
  SUPPORTED_FILE_TYPES,
} from "./constants";
export type { DefaultFolderName, FileCategory } from "./constants";

// Types
export type {
  UploadFileOptions,
  UploadResult,
  DeleteResult,
  SignedUrlResult,
  AttachmentMetadata,
  StorageObjectRef,
} from "./types";

// Legacy compatibility shim (delegates to the Storage Service).
// Kept so existing callers keep working until fully migrated.
export { storeFile, getFileBuffer, deleteFile as deleteLegacyFile } from "./legacy";
export type { StoredFile, StoreOptions } from "./legacy";
