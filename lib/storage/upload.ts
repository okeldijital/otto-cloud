import { PutObjectCommand } from "@aws-sdk/client-s3";
import { storageClient } from "./client";
import { storageConfig } from "@/lib/config/storage";
import { detectMimeCategory } from "./utils";
import {
  DEFAULT_KEY_PREFIX,
  MAX_UPLOAD_SIZE,
} from "./constants";
import { generateStorageKey, sanitizeFilename } from "./utils";
import type {
  UploadFileOptions,
  UploadResult,
} from "./types";

/**
 * Persist a file in object storage and return its metadata.
 *
 * This is the single, reusable upload path used by every business module.
 * No application module uploads directly to the provider; they all call
 * this function (or a higher-level Attachment helper built on top of it).
 *
 * The storage key follows the canonical layout:
 *   organizations/{organizationId}/{folder}/{uuid}-{filename}
 */
export async function uploadFile(options: UploadFileOptions): Promise<UploadResult> {
  const {
    body,
    organizationId,
    folder,
    fileName,
    mimeType,
    key,
    contentDisposition = "inline",
    metadata,
    maxSizeBytes = MAX_UPLOAD_SIZE,
  } = options;

  if (!Buffer.isBuffer(body)) {
    throw new Error("uploadFile requires a Buffer body");
  }

  const fileSize = body.byteLength;
  if (fileSize > maxSizeBytes) {
    throw new Error(
      `File size ${fileSize} exceeds maximum allowed size of ${maxSizeBytes} bytes`
    );
  }

  if (!storageConfig.allowedMimeTypes.includes(mimeType)) {
    throw new Error(`MIME type "${mimeType}" is not allowed`);
  }

  const safeFileName = sanitizeFilename(fileName);
  const storageKey =
    key ??
    generateStorageKey({
      organizationId,
      folder,
      fileName: safeFileName,
    });

  const bucket = storageConfig.bucket;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    Body: body,
    ContentType: mimeType,
    ContentDisposition: contentDisposition,
    Metadata: {
      organizationId,
      folder,
      originalFileName: safeFileName,
      ...metadata,
    },
  });

  const response = await storageClient.send(command);

  const url = storageConfig.publicBaseUrl
    ? `${storageConfig.publicBaseUrl.replace(/\/$/, "")}/${storageKey}`
    : undefined;

  const category = detectMimeCategory(mimeType);

  return {
    key: storageKey,
    bucket,
    fileName: safeFileName,
    mimeType,
    fileSize,
    versionId: response.VersionId,
    etag: response.ETag,
    category,
    url,
  };
}

/**
 * Re-export the canonical key prefix for convenience.
 */
export { DEFAULT_KEY_PREFIX };
