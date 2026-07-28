import { generateStorageKey, sanitizeFilename } from "@/lib/storage/utils";
import { extractExtension, sha256 } from "../checksum";
import { DOCUMENT_STORAGE_FOLDER } from "../constants";
import type {
  DocumentMetadata,
  SoftDeleteDocumentRequest,
  UploadDocumentRequest,
  UploadDocumentResponse,
} from "../dto/document.dto";
import { emitPlatformDocumentEvent } from "../events/document-events";
import { getCloudflareR2Provider } from "../providers/cloudflare-r2";
import { documentRepository } from "../repositories/document-repository";
import type { StorageProvider } from "../types/storage";
import { DocumentServiceError } from "../types/errors";
import { validateDocumentUpload } from "../validation/upload-validation";
import type { DocumentAsset } from "@prisma/client";

/**
 * DocumentService — platform-level immutable document storage.
 *
 * Responsibilities:
 *   validation → checksum → metadata → storage → database → platform events
 *
 * No Contract / Release / Artist branching.
 * Business modules link documents via their own relationship tables and services.
 */
export class DocumentService {
  constructor(
    private readonly storage: StorageProvider = getCloudflareR2Provider()
  ) {}

  /**
   * Upload a file as a new immutable platform document.
   * Does not create business relationships.
   */
  async uploadDocument(input: UploadDocumentRequest): Promise<UploadDocumentResponse> {
    validateDocumentUpload({
      fileName: input.fileName,
      mimeType: input.mimeType,
      body: input.body,
      allowedMimeTypes: input.allowedMimeTypes,
      allowedExtensions: input.allowedExtensions,
      maxSizeBytes: input.maxSizeBytes,
    });

    const checksum = sha256(input.body);
    const originalFilename = input.fileName.trim();
    const safeName = sanitizeFilename(originalFilename);
    const extension = extractExtension(originalFilename);
    const folder = input.folder ?? DOCUMENT_STORAGE_FOLDER;
    const storageKey = generateStorageKey({
      organizationId: input.organizationId,
      folder,
      fileName: safeName,
    });

    const stored = await this.storage.upload({
      key: storageKey,
      body: input.body,
      mimeType: input.mimeType,
      metadata: {
        organizationId: input.organizationId,
        checksum,
        originalFilename: safeName,
      },
    });

    // DB create after blob. On failure the blob may orphan — see orphan recovery docs.
    let document: DocumentAsset;
    try {
      document = await documentRepository.create({
        organizationId: input.organizationId,
        storageKey: stored.key,
        storageProvider: stored.provider,
        storageBucket: stored.bucket,
        storageRegion: stored.region,
        originalFilename,
        extension,
        mimeType: input.mimeType,
        fileSize: BigInt(input.body.byteLength),
        checksum,
        uploadedBy: input.userId,
        uploadedAt: new Date(),
      });
    } catch (error) {
      throw new DocumentServiceError(
        error instanceof Error ? error.message : "Failed to persist document",
        500,
        "DOCUMENT_PERSIST_FAILED",
        [
          "Blob may have been written; reconciliation job should detect orphans by storage metadata.",
        ]
      );
    }

    await emitPlatformDocumentEvent({
      event: "DocumentUploaded",
      organizationId: input.organizationId,
      userId: input.userId,
      documentId: document.id,
      entityName: originalFilename,
      changes: {
        checksum,
        mimeType: input.mimeType,
        fileSize: input.body.byteLength,
        storageProvider: stored.provider,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    const meta = this.toMetadata(document);
    return {
      document: meta,
      uploadedAt: meta.uploadedAt,
    };
  }

  /**
   * Soft-delete a platform document. Never hard-deletes the storage object.
   */
  async softDeleteDocument(
    input: SoftDeleteDocumentRequest
  ): Promise<DocumentMetadata> {
    const existing = await documentRepository.findActiveByIdForOrg(
      input.documentId,
      input.organizationId
    );
    if (!existing) {
      // Distinguish already deleted vs not found
      const any = await documentRepository.findById(input.documentId);
      if (any && any.organizationId === input.organizationId && any.deletedAt) {
        throw new DocumentServiceError(
          "Document already deleted",
          410,
          "DOCUMENT_DELETED"
        );
      }
      throw new DocumentServiceError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    const updated = await documentRepository.softDelete(input.documentId);

    await emitPlatformDocumentEvent({
      event: "DocumentDeleted",
      organizationId: input.organizationId,
      userId: input.userId,
      documentId: input.documentId,
      entityName: updated.originalFilename,
      changes: { softDelete: true },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return this.toMetadata(updated);
  }

  async getActiveDocument(
    documentId: string,
    organizationId: string
  ): Promise<DocumentAsset | null> {
    return documentRepository.findActiveByIdForOrg(documentId, organizationId);
  }

  /**
   * Signed URL for download preparation (platform utility; modules decide exposure).
   */
  async getSignedDownloadUrl(
    documentId: string,
    organizationId: string,
    expiresInSeconds?: number
  ): Promise<string> {
    const doc = await documentRepository.findActiveByIdForOrg(
      documentId,
      organizationId
    );
    if (!doc) {
      throw new DocumentServiceError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }
    return this.storage.signedUrl(
      { key: doc.storageKey, bucket: doc.storageBucket },
      expiresInSeconds
    );
  }

  toMetadata(doc: DocumentAsset): DocumentMetadata {
    return {
      id: doc.id,
      originalFilename: doc.originalFilename,
      extension: doc.extension,
      mimeType: doc.mimeType,
      fileSize: Number(doc.fileSize),
      checksum: doc.checksum,
      uploadedBy: doc.uploadedBy,
      uploadedAt: doc.uploadedAt.toISOString(),
      deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
      status: doc.deletedAt ? "deleted" : "active",
      storageProvider: doc.storageProvider,
    };
  }

  /** @deprecated alias for callers that used toMetadataDto */
  toMetadataDto(doc: DocumentAsset): DocumentMetadata {
    return this.toMetadata(doc);
  }
}

export const documentService = new DocumentService();
