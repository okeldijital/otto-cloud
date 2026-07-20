/**
 * Legacy storage compatibility shim.
 *
 * This file previously contained a second, self-contained implementation that
 * talked to S3 / the local filesystem directly. As part of the Universal File
 * Management milestone there is now exactly ONE storage implementation: the
 * Otto Storage Service in `lib/storage` (backed by Cloudflare R2 via
 * `lib/storage/client.ts`).
 *
 * To preserve existing behaviour while removing the duplicate implementation,
 * the legacy exports (`storeFile`, `deleteFile`, `getFileBuffer`) are thin
 * adapters that delegate to the Storage Service. New code should call the
 * Storage Service directly via `@/lib/storage`. Once every caller is migrated
 * this file can be deleted.
 */

import { uploadFile } from "./upload";
import { downloadFile } from "./download";
import { deleteFile as storageDeleteFile } from "./delete";
import { formatFileSize } from "./utils";
import { getLegacyCatalogScopeId } from "@/lib/auth/migration-compat";

/** @deprecated Prefer explicit organizationId from getOrganizationContext() */
const DEFAULT_ORG_ID = getLegacyCatalogScopeId();

export interface StoredFile {
  url: string;
  filename: string;
  checksum: string;
  size_bytes: number;
  mime_type: string;
}

export interface StoreOptions {
  domain: "releases" | "contracts" | "office";
  entityId?: string | number;
  allowedMime?: string[];
  maxSizeBytes?: number;
}

/**
 * Persist a file via the universal Storage Service.
 *
 * Maps the legacy call shape onto `uploadFile`. The `domain` is used as the
 * storage folder; organization defaults to the system default because legacy
 * callers do not supply one (new callers should use the universal upload API
 * at `/api/storage/upload` which is fully org-scoped).
 */
export async function storeFile(
  file: File,
  prefix: string,
  options: StoreOptions
): Promise<StoredFile> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const result = await uploadFile({
    body: buffer,
    organizationId: DEFAULT_ORG_ID,
    folder: options.domain,
    fileName: file.name,
    mimeType: file.type,
    maxSizeBytes: options.maxSizeBytes,
  });

  return {
    url: result.url ?? result.key,
    filename: result.fileName,
    checksum: result.etag ?? "",
    size_bytes: result.fileSize,
    mime_type: result.mimeType,
  };
}

export async function deleteFile(storageUrl: string): Promise<void> {
  if (!storageUrl) return;
  // Legacy URLs were either `/key` (S3) or `/uploads/...` (local). Strip the
  // leading slash to obtain the storage key the Storage Service understands.
  const key = storageUrl.replace(/^\//, "");
  await storageDeleteFile({ key }).catch(() => {});
}

export async function getFileBuffer(storageUrl: string): Promise<Buffer | null> {
  if (!storageUrl) return null;
  const key = storageUrl.replace(/^\//, "");
  try {
    return await downloadFile({ key });
  } catch {
    return null;
  }
}

export { formatFileSize };
