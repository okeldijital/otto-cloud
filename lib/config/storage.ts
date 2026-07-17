/**
 * Storage configuration for Otto Cloud.
 *
 * This is the single source of truth for storage-related configuration.
 * No other module should read storage environment variables directly.
 *
 * The shape of this object intentionally abstracts the backend so the
 * underlying provider (currently Cloudflare R2) can be swapped without
 * touching application code.
 */

export type StorageProvider = "cloudflare-r2" | "aws-s3" | (string & {});

function requireEnv(name: string): string {
  const value = process.env[name];
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
 * Keep this list permissive enough for real-world documents and media,
 * but restrictive enough to mitigate abuse.
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
 *
 * Kept here so the same limit is enforced everywhere uploads happen.
 */
export const maxUploadSize = 50 * 1024 * 1024;

export const storageConfig = {
  /**
   * Logical storage provider identifier.
   * Used by factory/adapter selection logic and telemetry.
   */
  provider: "cloudflare-r2" as StorageProvider,

  /**
   * Target bucket name.
   */
  bucket: requireEnv("R2_BUCKET_NAME"),

  /**
   * S3-compatible endpoint (Cloudflare R2).
   */
  endpoint: requireEnv("R2_ENDPOINT"),

  /**
   * Region. R2 exposes `auto` which is the documented value.
   */
  region: "auto" as const,

  /**
   * Credentials sourced from the environment via the central config.
   * Never read these directly elsewhere.
   */
  credentials: {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  },

  /**
   * Maximum size for a single object upload, in bytes.
   */
  maxUploadSize,

  /**
   * Allow-list of accepted MIME types.
   */
  allowedMimeTypes: allowedMimeTypes as string[],

  /**
   * Public base URL used to construct absolute URLs for public assets.
   * Optional: if unset, consumers should use signed URLs for access.
   */
  publicBaseUrl: process.env.R2_PUBLIC_URL || "",
} as const;

export type StorageConfig = typeof storageConfig;
