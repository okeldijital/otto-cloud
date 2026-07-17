import { GetObjectCommand } from "@aws-sdk/client-s3";
import { storageClient } from "./client";
import { storageConfig } from "@/lib/config/storage";
import type { StorageObjectRef } from "./types";

/**
 * Retrieve an object's raw bytes from storage by its key.
 *
 * Pure retrieval — no business logic. Intended for server-side processing
 * (virus scanning, OCR, transcoding, previews) and as the basis for
 * download helpers used by application modules.
 */
export async function downloadFile(ref: StorageObjectRef): Promise<Buffer> {
  const bucket = ref.bucket ?? storageConfig.bucket;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: ref.key,
  });

  const response = await storageClient.send(command);
  const body = response.Body;
  if (!body) {
    throw new Error(`No body returned for key "${ref.key}"`);
  }

  const bytes = await body.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * Fetch an object's metadata (content type, size, etc.) without downloading
 * its contents. Useful for validating attachments before streaming.
 */
export async function getFileMetadata(ref: StorageObjectRef): Promise<{
  key: string;
  bucket: string;
  contentType?: string;
  contentLength?: number;
  metadata?: Record<string, string>;
  versionId?: string;
}> {
  const bucket = ref.bucket ?? storageConfig.bucket;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: ref.key,
  });

  const response = await storageClient.send(command);
  return {
    key: ref.key,
    bucket,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    metadata: response.Metadata,
    versionId: response.VersionId,
  };
}
