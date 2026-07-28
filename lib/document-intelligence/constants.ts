export const EXTRACTION_PROMPT_VERSION = "contract-extract-v1";

export const JOB_STATUS = {
  queued: "queued",
  running: "running",
  completed: "completed",
  failed: "failed",
  retrying: "retrying",
  cancelled: "cancelled",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export const EXTRACTION_STATUS = {
  draft: "draft",
  failed: "failed",
  awaiting_verification: "awaiting_verification",
  verified: "verified",
} as const;

export const FIELD_VERIFICATION_STATE = {
  draft: "draft",
  accepted: "accepted",
  rejected: "rejected",
  edited: "edited",
  /** Promoted into verified layer after document completion */
  verified: "verified",
} as const;

export type FieldVerificationState =
  (typeof FIELD_VERIFICATION_STATE)[keyof typeof FIELD_VERIFICATION_STATE];

export const SESSION_STATUS = {
  pending: "pending",
  in_progress: "in_progress",
  completed: "completed",
  reopened: "reopened",
} as const;

/** Fields that must be reviewed (not left as draft) before complete. */
export const REQUIRED_VERIFICATION_FIELDS = [
  "title",
  "parties",
  "effective_date",
] as const;

/** Default confidence threshold for bulk-accept. */
export const DEFAULT_ACCEPT_CONFIDENCE_THRESHOLD = 0.8;

/** Minimum printable chars per page to treat PDF as native text (skip OCR). */
export const NATIVE_TEXT_THRESHOLD_PER_PAGE = 40;

export const DOCUMENT_TYPES = [
  "recording_agreement",
  "publishing_agreement",
  "distribution_agreement",
  "producer_agreement",
  "nda",
  "license",
  "unknown",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  recording_agreement: "Recording Agreement",
  publishing_agreement: "Publishing Agreement",
  distribution_agreement: "Distribution Agreement",
  producer_agreement: "Producer Agreement",
  nda: "NDA",
  license: "License",
  unknown: "Unknown",
};

export const EXTRACTION_FIELD_DEFS: {
  key: string;
  label: string;
}[] = [
  { key: "title", label: "Contract title" },
  { key: "effective_date", label: "Effective date" },
  { key: "expiration_date", label: "Expiration date" },
  { key: "parties", label: "Parties" },
  { key: "governing_law", label: "Governing law" },
  { key: "reference_number", label: "Reference number" },
  { key: "currency", label: "Currency" },
  { key: "territory", label: "Territory" },
  { key: "term", label: "Term" },
  { key: "rights", label: "Rights" },
  { key: "obligations", label: "Obligations" },
];

export const MAX_EXTRACTION_ATTEMPTS = 3;
