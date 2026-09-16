/**
 * Document Intelligence Layer (Milestone 3.0)
 *
 * Consumes Document Platform; never modifies storage or the PDF viewer.
 * All AI output is draft until human verification.
 */

export {
  DocumentIntelligenceService,
  documentIntelligenceService,
} from "./services/document-intelligence-service";
export { extractionRepository } from "./repositories/extraction-repository";
export { IntelligenceError } from "./types/errors";
export {
  EXTRACTION_PROMPT_VERSION,
  JOB_STATUS,
  EXTRACTION_STATUS,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  EXTRACTION_FIELD_DEFS,
} from "./constants";
export { classifyDocument, documentTypeLabel } from "./classification";
export { clampConfidence, computeOverallConfidence } from "./confidence";
export type { OcrProvider } from "./providers/ocr-provider";
export type { ExtractionProvider } from "./providers/extraction-provider";
export { PdfTextOcrProvider, defaultOcrProvider } from "./providers/pdf-text-ocr";
export {
  DeterministicExtractionProvider,
  deterministicExtractionProvider,
} from "./providers/deterministic-extraction";
export { AiExtractionAdapter, aiExtractionProvider } from "./providers/ai-extraction-adapter";
export { verificationService } from "./verification/verification-service";
export { canVerifyDocuments, assertCanVerify } from "./verification/permissions";
export {
  confidenceBand,
  confidenceBandLabel,
  confidenceBandVariant,
} from "./verification/confidence-ui";
export {
  FIELD_VERIFICATION_STATE,
  SESSION_STATUS,
  REQUIRED_VERIFICATION_FIELDS,
  DEFAULT_ACCEPT_CONFIDENCE_THRESHOLD,
} from "./constants";
