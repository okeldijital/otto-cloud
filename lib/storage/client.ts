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
 *
 * The client is created lazily so importing this module does not require
 * storage env vars (unit tests / DocumentService with a mock provider).
 */

let _client: S3Client | null = null;

function createClient(): S3Client {
  return new S3Client({
    region: storageConfig.region,
    endpoint: storageConfig.endpoint,
    credentials: {
      accessKeyId: storageConfig.credentials.accessKeyId,
      secretAccessKey: storageConfig.credentials.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export const storageClient = new Proxy({} as S3Client, {
  get(_target, prop, receiver) {
    if (!_client) {
      _client = createClient();
    }
    const value = Reflect.get(_client as object, prop, receiver);
    return typeof value === "function" ? value.bind(_client) : value;
  },
});

export type StorageClient = S3Client;

/** Test helper — reset singleton between suites. */
export function resetStorageClient(): void {
  _client = null;
}
