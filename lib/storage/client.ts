import { S3Client } from "@aws-sdk/client-s3";
import { storageConfig } from "@/lib/config/storage";

/**
 * Singleton S3-compatible client for Otto Cloud storage.
 *
 * Configured for Cloudflare R2 (S3-compatible API) using the central
 * storage configuration. This module contains NO business logic — it only
 * constructs and exports the client so it can be reused by every storage
 * operation (upload, download, delete, signed URLs).
 *
 * Swapping providers (e.g. AWS S3) only requires changing `storageConfig`;
 * nothing else in the storage package reads credentials directly.
 */
export const storageClient = new S3Client({
  region: storageConfig.region,
  endpoint: storageConfig.endpoint,
  credentials: {
    accessKeyId: storageConfig.credentials.accessKeyId,
    secretAccessKey: storageConfig.credentials.secretAccessKey,
  },
  forcePathStyle: true,
});

export type StorageClient = typeof storageClient;
