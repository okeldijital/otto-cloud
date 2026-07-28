/** Contract Center document policy — PDF signed agreements only. */
export const CONTRACT_DOCUMENT_ALLOWED_MIME_TYPES = ["application/pdf"] as const;
export const CONTRACT_DOCUMENT_ALLOWED_EXTENSIONS = [".pdf"] as const;
export const DEFAULT_CONTRACT_RELATIONSHIP_TYPE = "signed_agreement";
export const CONTRACT_DOCUMENT_MAX_SIZE_BYTES = 50 * 1024 * 1024;
