import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storageClient } from "./client";
import { storageConfig } from "@/lib/config/storage";
import { DEFAULT_SIGNED_URL_EXPIRY } from "./constants";
import type { SignedUrlResult, StorageObjectRef } from "./types";

/**
 * Generate a time-limited, pre-signed URL that allows downloading a stored
 * object without exposing credentials or making the bucket public.
 *
 * @param ref       Object reference (key + optional bucket override).
 * @param expiresIn Expiry in seconds. Defaults to 15 minutes.
 */
export async function getSignedDownloadUrl(
  ref: StorageObjectRef,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY
): Promise<SignedUrlResult> {
  const bucket = ref.bucket ?? storageConfig.bucket;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: ref.key,
  });

  const url = await getSignedUrl(storageClient, command, { expiresIn });
  return { url, key: ref.key, expiresIn };
}

/**
 * Generate a time-limited, pre-signed URL that allows uploading content
 * directly to a storage key (client-side / browser uploads).
 *
 * The caller is responsible for ensuring the key follows the canonical
 * layout (see {@link generateStorageKey}). The returned URL targets a
 * `PUT` request with the provided content type.
 *
 * @param ref         Object reference (key + optional bucket override).
 * @param contentType MIME type the client must upload with.
 * @param expiresIn   Expiry in seconds. Defaults to 15 minutes.
 */
export async function getSignedUploadUrl(
  ref: StorageObjectRef,
  contentType: string,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY
): Promise<SignedUrlResult> {
  const bucket = ref.bucket ?? storageConfig.bucket;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: ref.key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(storageClient, command, { expiresIn });
  return { url, key: ref.key, expiresIn };
}
