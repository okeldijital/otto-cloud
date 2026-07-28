/**
 * Contract Center domain package.
 *
 * Owns contract-specific document relationships and facades.
 * Document storage itself is owned by @/lib/documents (platform).
 */

export {
  ContractDocumentService,
  contractDocumentService,
} from "./services/contract-document-service";
export {
  ContractDocumentRepository,
  contractDocumentRepository,
} from "./repositories/contract-document-repository";
export {
  CONTRACT_DOCUMENT_ALLOWED_MIME_TYPES,
  CONTRACT_DOCUMENT_ALLOWED_EXTENSIONS,
  DEFAULT_CONTRACT_RELATIONSHIP_TYPE,
  CONTRACT_DOCUMENT_MAX_SIZE_BYTES,
} from "./constants";
export type {
  ContractDocumentLink,
  ContractDocumentDto,
  LinkContractDocumentRequest,
  UploadAndLinkContractDocumentRequest,
  UploadAndLinkContractDocumentResponse,
  ListContractDocumentsResult,
  ContractDocumentRelationshipType,
} from "./dto/contract-document.dto";
