import { prisma } from "@/lib/prisma";
import type { DocumentAsset, Prisma } from "@prisma/client";
import type { DocumentRecord } from "../dto/document.dto";

/**
 * DocumentRepository — persistence only for platform document_assets.
 * No business rules. No storage I/O. No Contract references.
 */
export class DocumentRepository {
  async create(data: Prisma.DocumentAssetCreateInput): Promise<DocumentAsset> {
    return prisma.documentAsset.create({ data });
  }

  async findById(id: string): Promise<DocumentAsset | null> {
    return prisma.documentAsset.findUnique({ where: { id } });
  }

  async findActiveByIdForOrg(
    id: string,
    organizationId: string
  ): Promise<DocumentAsset | null> {
    return prisma.documentAsset.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });
  }

  async softDelete(id: string, deletedAt: Date = new Date()): Promise<DocumentAsset> {
    return prisma.documentAsset.update({
      where: { id },
      data: { deletedAt },
    });
  }

  /**
   * Orphan candidates: rows with no deletedAt that modules may use for reconciliation.
   * Actual "unlinked" detection is relationship-table specific (see contract-center).
   */
  async findByChecksum(
    organizationId: string,
    checksum: string
  ): Promise<DocumentAsset[]> {
    return prisma.documentAsset.findMany({
      where: { organizationId, checksum, deletedAt: null },
    });
  }

  toRecord(row: DocumentAsset): DocumentRecord {
    return {
      id: row.id,
      organizationId: row.organizationId,
      storageKey: row.storageKey,
      storageProvider: row.storageProvider,
      storageBucket: row.storageBucket,
      storageRegion: row.storageRegion,
      originalFilename: row.originalFilename,
      extension: row.extension,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      checksum: row.checksum,
      uploadedBy: row.uploadedBy,
      uploadedAt: row.uploadedAt,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export const documentRepository = new DocumentRepository();
