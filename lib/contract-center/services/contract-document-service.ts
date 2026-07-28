import { prisma } from "@/lib/prisma";
import {
  documentService,
  DocumentServiceError,
  type DocumentMetadata,
} from "@/lib/documents";
import {
  CONTRACT_DOCUMENT_ALLOWED_EXTENSIONS,
  CONTRACT_DOCUMENT_ALLOWED_MIME_TYPES,
  CONTRACT_DOCUMENT_MAX_SIZE_BYTES,
  DEFAULT_CONTRACT_RELATIONSHIP_TYPE,
} from "../constants";
import type {
  ListContractDocumentsResult,
  UploadAndLinkContractDocumentRequest,
  UploadAndLinkContractDocumentResponse,
} from "../dto/contract-document.dto";
import { emitContractDocumentEvent } from "../events/contract-document-events";
import { contractDocumentRepository } from "../repositories/contract-document-repository";

/**
 * ContractDocumentService — Contract Center facade over the Document Platform.
 *
 * Owns: contract ownership checks, relationship create/list, contract-domain events.
 * Does not: talk to R2, implement checksums, or own document_assets rows.
 */
export class ContractDocumentService {
  private async requireContract(contractId: number, legacyIntOrgId: number) {
    const contract = await prisma.contracts.findFirst({
      where: { id: contractId, organization_id: legacyIntOrgId },
    });
    if (!contract) {
      throw new DocumentServiceError("Contract not found", 404, "CONTRACT_NOT_FOUND");
    }
    return contract;
  }

  /**
   * Upload via Document Platform, then link to contract.
   * Public Contract API behavior preserved from Milestone 2.1.
   */
  async uploadAndLink(
    input: UploadAndLinkContractDocumentRequest
  ): Promise<UploadAndLinkContractDocumentResponse> {
    await this.requireContract(input.contractId, input.legacyIntOrgId);

    const uploaded = await documentService.uploadDocument({
      organizationId: input.organizationId,
      userId: input.userId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      body: input.body,
      allowedMimeTypes: CONTRACT_DOCUMENT_ALLOWED_MIME_TYPES,
      allowedExtensions: CONTRACT_DOCUMENT_ALLOWED_EXTENSIONS,
      maxSizeBytes: CONTRACT_DOCUMENT_MAX_SIZE_BYTES,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    const relationshipType =
      input.relationshipType || DEFAULT_CONTRACT_RELATIONSHIP_TYPE;

    let relationshipId: string;
    try {
      const relation = await contractDocumentRepository.create({
        contractId: input.contractId,
        relationshipType,
        createdBy: input.userId,
        document: { connect: { id: uploaded.document.id } },
      });
      relationshipId = relation.id;
    } catch (error) {
      // Document exists without link — platform row retained for reconciliation.
      throw new DocumentServiceError(
        error instanceof Error ? error.message : "Failed to link document to contract",
        500,
        "DOCUMENT_LINK_FAILED"
      );
    }

    await emitContractDocumentEvent({
      event: "ContractDocumentLinked",
      organizationId: input.organizationId,
      userId: input.userId,
      contractId: input.contractId,
      documentId: uploaded.document.id,
      relationshipId,
      entityName: uploaded.document.originalFilename,
      changes: { relationshipType },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      document: uploaded.document,
      relationshipId,
      relationshipType,
      uploadedAt: uploaded.uploadedAt,
    };
  }

  async listForContract(params: {
    contractId: number;
    organizationId: string;
    legacyIntOrgId: number;
    /** When true, include soft-deleted documents (for repository status filters). */
    includeDeletedDocuments?: boolean;
  }): Promise<ListContractDocumentsResult> {
    await this.requireContract(params.contractId, params.legacyIntOrgId);

    const rows = await contractDocumentRepository.listByContract(params.contractId, {
      includeDeletedDocuments: params.includeDeletedDocuments ?? true,
    });

    const items = rows
      .filter((row) => row.document.organizationId === params.organizationId)
      .map((row) => ({
        relationshipId: row.id,
        relationshipType: row.relationshipType,
        linkedAt: row.createdAt.toISOString(),
        linkedBy: row.createdBy,
        document: documentService.toMetadata(row.document),
      }));

    return { items, total: items.length };
  }

  /**
   * Signed download URL for a document linked to a contract.
   * Never returns storage keys or bucket names.
   */
  async getDownloadUrl(params: {
    contractId: number;
    documentId: string;
    organizationId: string;
    legacyIntOrgId: number;
  }): Promise<{ url: string; filename: string; mimeType: string }> {
    await this.requireContract(params.contractId, params.legacyIntOrgId);

    const link = await contractDocumentRepository.findByContractAndDocument(
      params.contractId,
      params.documentId
    );
    if (!link || link.document.organizationId !== params.organizationId) {
      throw new DocumentServiceError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }
    if (link.document.deletedAt) {
      throw new DocumentServiceError(
        "Document has been deleted",
        410,
        "DOCUMENT_DELETED"
      );
    }

    const url = await documentService.getSignedDownloadUrl(
      params.documentId,
      params.organizationId
    );

    return {
      url,
      filename: link.document.originalFilename,
      mimeType: link.document.mimeType,
    };
  }

  /**
   * Soft-delete the platform document after verifying contract relationship.
   * Relationship row is retained; document is soft-deleted.
   */
  async softDeleteLinked(params: {
    contractId: number;
    documentId: string;
    organizationId: string;
    legacyIntOrgId: number;
    userId: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<DocumentMetadata> {
    await this.requireContract(params.contractId, params.legacyIntOrgId);

    const link = await contractDocumentRepository.findByContractAndDocument(
      params.contractId,
      params.documentId
    );
    if (!link || link.document.organizationId !== params.organizationId) {
      throw new DocumentServiceError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    const updated = await documentService.softDeleteDocument({
      documentId: params.documentId,
      organizationId: params.organizationId,
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    await emitContractDocumentEvent({
      event: "ContractDocumentUnlinked",
      organizationId: params.organizationId,
      userId: params.userId,
      contractId: params.contractId,
      documentId: params.documentId,
      relationshipId: link.id,
      entityName: updated.originalFilename,
      changes: { softDelete: true },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return updated;
  }
}

export const contractDocumentService = new ContractDocumentService();
