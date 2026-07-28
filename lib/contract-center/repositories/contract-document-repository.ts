import { prisma } from "@/lib/prisma";
import type { ContractDocumentRelation, DocumentAsset, Prisma } from "@prisma/client";

export type ContractDocumentWithAsset = ContractDocumentRelation & {
  document: DocumentAsset;
};

/**
 * ContractDocumentRepository — Contract domain relationship persistence only.
 * Does not perform storage I/O or document creation.
 */
export class ContractDocumentRepository {
  async create(
    data: Prisma.ContractDocumentRelationCreateInput
  ): Promise<ContractDocumentRelation> {
    return prisma.contractDocumentRelation.create({ data });
  }

  async findById(id: string): Promise<ContractDocumentRelation | null> {
    return prisma.contractDocumentRelation.findUnique({ where: { id } });
  }

  async listByContract(
    contractId: number,
    options: { includeDeletedDocuments?: boolean } = {}
  ): Promise<ContractDocumentWithAsset[]> {
    return prisma.contractDocumentRelation.findMany({
      where: {
        contractId,
        ...(options.includeDeletedDocuments
          ? {}
          : { document: { deletedAt: null } }),
      },
      include: { document: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByContractAndDocument(
    contractId: number,
    documentId: string
  ): Promise<ContractDocumentWithAsset | null> {
    return prisma.contractDocumentRelation.findFirst({
      where: { contractId, documentId },
      include: { document: true },
    });
  }

  /**
   * Documents that exist for an org but have no contract link (reconciliation aid).
   * Full platform orphan detection also needs other modules' relation tables.
   */
  async listLinkedDocumentIds(contractId: number): Promise<string[]> {
    const rows = await prisma.contractDocumentRelation.findMany({
      where: { contractId },
      select: { documentId: true },
    });
    return rows.map((r) => r.documentId);
  }
}

export const contractDocumentRepository = new ContractDocumentRepository();
