/**
 * Storage constants for Otto Cloud.
 *
 * Every magic number, folder name, and default lives here so the rest of
 * the storage package stays free of scattered literals. This makes the
 * system easier to tune and keeps behaviour consistent across modules.
 */

/**
 * Default expiry for signed URLs, in seconds.
 * 15 minutes.
 */
export const DEFAULT_SIGNED_URL_EXPIRY = 15 * 60;

/**
 * Default storage key prefix for all objects.
 */
export const DEFAULT_KEY_PREFIX = "organizations";

/**
 * Canonical folder names used when building storage keys.
 *
 * These correspond to the universal Attachment system: every business
 * entity groups its attachments under a stable folder so keys remain
 * human-readable and organisation-scoped.
 */
export const DEFAULT_FOLDER_NAMES = {
  contracts: "contracts",
  releases: "releases",
  artists: "artists",
  songs: "songs",
  workspaces: "workspaces",
  office: "office",
  avatars: "avatars",
  misc: "misc",
} as const;

export type DefaultFolderName = (typeof DEFAULT_FOLDER_NAMES)[keyof typeof DEFAULT_FOLDER_NAMES];

/**
 * Maximum upload size, in bytes (50 MB).
 */
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

/**
 * Maximum length of a generated UUID-prefixed filename segment.
 */
export const MAX_FILENAME_LENGTH = 200;

/**
 * Supported file categories used by {@link detectMimeCategory}.
 * These categories are intentionally broad so future features
 * (image optimisation, audio transcoding, OCR, etc.) can branch on them.
 */
export const SUPPORTED_FILE_TYPES = {
  image: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/avif",
    "image/bmp",
    "image/tiff",
  ],
  audio: [
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/aac",
    "audio/ogg",
    "audio/flac",
    "audio/mp4",
    "audio/webm",
  ],
  video: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "text/markdown",
  ],
  archive: [
    "application/zip",
    "application/x-rar-compressed",
    "application/gzip",
    "application/x-7z-compressed",
  ],
} as const;

export type FileCategory = keyof typeof SUPPORTED_FILE_TYPES;
