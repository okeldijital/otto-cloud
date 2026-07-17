import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { storageClient } from "./client";
import { storageConfig } from "@/lib/config/storage";
import type { DeleteResult, StorageObjectRef } from "./types";

/**
 * Delete an object from storage by its key.
 *
 * Idempotent: missing objects are treated as already deleted and reported
 * as a success so callers do not need to special-case "not found".
 */
export async function deleteFile(ref: StorageObjectRef): Promise<DeleteResult> {
  const bucket = ref.bucket ?? storageConfig.bucket;

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: ref.key,
    });
    await storageClient.send(command);
    return { key: ref.key, success: true };
  } catch (error) {
    throw new Error(
      `Failed to delete storage object "${ref.key}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
