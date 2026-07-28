import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storageClient } from "@/lib/storage/client";
import { storageConfig } from "@/lib/config/storage";
import { DEFAULT_SIGNED_URL_EXPIRY } from "@/lib/storage/constants";
import type {
  StorageObjectMetadata,
  StorageObjectRef,
  StorageProvider,
  StorageUploadParams,
  StorageUploadResult,
} from "../types/storage";

/**
 * Cloudflare R2 implementation of StorageProvider.
 *
 * Uses the platform S3-compatible client and central storage config.
 * Do not construct R2 clients or read R2 env vars outside this provider /
 * lib/config/storage.
 */
export class CloudflareR2Provider implements StorageProvider {
  readonly name = "cloudflare-r2";

  async upload(params: StorageUploadParams): Promise<StorageUploadResult> {
    const bucket = storageConfig.bucket;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.mimeType,
      Metadata: params.metadata,
    });
    const response = await storageClient.send(command);
    return {
      key: params.key,
      bucket,
      region: storageConfig.region ?? "auto",
      provider: this.name,
      etag: response.ETag,
    };
  }

  async download(ref: StorageObjectRef): Promise<Buffer> {
    const bucket = ref.bucket ?? storageConfig.bucket;
    const response = await storageClient.send(
      new GetObjectCommand({ Bucket: bucket, Key: ref.key })
    );
    if (!response.Body) {
      throw new Error(`No body returned for key "${ref.key}"`);
    }
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(ref: StorageObjectRef): Promise<void> {
    const bucket = ref.bucket ?? storageConfig.bucket;
    await storageClient.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: ref.key })
    );
  }

  async exists(ref: StorageObjectRef): Promise<boolean> {
    try {
      await this.metadata(ref);
      return true;
    } catch {
      return false;
    }
  }

  async metadata(ref: StorageObjectRef): Promise<StorageObjectMetadata> {
    const bucket = ref.bucket ?? storageConfig.bucket;
    const response = await storageClient.send(
      new HeadObjectCommand({ Bucket: bucket, Key: ref.key })
    );
    return {
      key: ref.key,
      bucket,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      metadata: response.Metadata,
    };
  }

  async signedUrl(
    ref: StorageObjectRef,
    expiresInSeconds: number = DEFAULT_SIGNED_URL_EXPIRY
  ): Promise<string> {
    const bucket = ref.bucket ?? storageConfig.bucket;
    const command = new GetObjectCommand({ Bucket: bucket, Key: ref.key });
    return getSignedUrl(storageClient, command, { expiresIn: expiresInSeconds });
  }
}

let defaultProvider: StorageProvider | null = null;

/** Singleton R2 provider for production wiring. */
export function getCloudflareR2Provider(): StorageProvider {
  if (!defaultProvider) {
    defaultProvider = new CloudflareR2Provider();
  }
  return defaultProvider;
}

/** Test hook to replace the singleton. */
export function setDefaultStorageProvider(provider: StorageProvider | null): void {
  defaultProvider = provider;
}
