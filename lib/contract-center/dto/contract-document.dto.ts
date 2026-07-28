import type { DocumentMetadata } from "@/lib/documents";

export type ContractDocumentRelationshipType =
  | "signed_agreement"
  | "supporting"
  | "amendment"
  | (string & {});

/** Linked document as seen from the Contract domain. */
export interface ContractDocumentLink {
  relationshipId: string;
  relationshipType: string;
  linkedAt: string;
  linkedBy: number | null;
  document: DocumentMetadata;
}

export interface LinkContractDocumentRequest {
  organizationId: string;
  /** Legacy INT org id for contracts table scoping. */
  legacyIntOrgId: number;
  contractId: number;
  documentId: string;
  userId: number;
  relationshipType?: ContractDocumentRelationshipType;
  ipAddress?: string;
  userAgent?: string;
}

export interface UploadAndLinkContractDocumentRequest {
  organizationId: string;
  legacyIntOrgId: number;
  contractId: number;
  userId: number;
  fileName: string;
  mimeType: string;
  body: Buffer;
  relationshipType?: ContractDocumentRelationshipType;
  ipAddress?: string;
  userAgent?: string;
}

export interface UploadAndLinkContractDocumentResponse {
  document: DocumentMetadata;
  relationshipId: string;
  relationshipType: string;
  uploadedAt: string;
}

export interface ListContractDocumentsResult {
  items: ContractDocumentLink[];
  total: number;
}

/** @deprecated alias */
export type ContractDocumentDto = ContractDocumentLink;
