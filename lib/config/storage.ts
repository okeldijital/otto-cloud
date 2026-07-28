/**
 * Storage configuration for Otto Cloud.
 *
 * This is the single source of truth for storage-related configuration.
 * No other module should read storage environment variables directly.
 *
 * Values are resolved lazily so importing this module never throws when env
 * is unset (e.g. unit tests, typecheck). Accessing credentials/bucket/endpoint
 * without configuration throws a clear error at use time.
 */

export type StorageProvider = "cloudflare-r2" | "aws-s3" | (string & {});

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing required storage environment variable: ${name}`);
  }
  return value;
}

/**
 * Allowed MIME types for uploads.
 *
 * These mirror the universal Attachment system used by every business
 * entity (Releases, Artists, Songs, Contracts, Workspaces, Office, etc.).
 */
export const allowedMimeTypes: readonly string[] = [
  // Documents
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
  "application/json",
  "application/octet-stream",
  // Images
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "image/bmp",
  "image/tiff",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "audio/mp4",
  "audio/webm",
  // Video
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  // Archives
  "application/zip",
  "application/x-rar-compressed",
  "application/gzip",
  "application/x-7z-compressed",
] as const;

/**
 * Maximum upload size in bytes (50 MB).
 */
export const maxUploadSize = 50 * 1024 * 1024;

/**
 * Lazy storage configuration.
 * Prefer property access so missing env fails at operation time, not import time.
 */
export const storageConfig = {
  provider: "cloudflare-r2" as StorageProvider,

  get bucket(): string {
    return requireEnv("R2_BUCKET_NAME");
  },

  get endpoint(): string {
    return requireEnv("R2_ENDPOINT");
  },

  region: "auto" as const,

  get credentials() {
    return {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    };
  },

  maxUploadSize,

  allowedMimeTypes: allowedMimeTypes as string[],

  get publicBaseUrl(): string {
    return process.env.R2_PUBLIC_URL || "";
  },
} as const;

export type StorageConfig = typeof storageConfig;
