import {
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from "./constants";

export interface ClassificationResult {
  documentType: DocumentType;
  confidence: number;
}

const RULES: { type: DocumentType; patterns: RegExp[]; weight: number }[] = [
  {
    type: "nda",
    patterns: [/non[- ]disclosure/i, /\bnda\b/i, /confidentiality agreement/i],
    weight: 0.9,
  },
  {
    type: "recording_agreement",
    patterns: [/recording agreement/i, /master recording/i, /exclusive recording/i],
    weight: 0.88,
  },
  {
    type: "publishing_agreement",
    patterns: [/publishing agreement/i, /music publishing/i, /composition rights/i],
    weight: 0.88,
  },
  {
    type: "distribution_agreement",
    patterns: [/distribution agreement/i, /digital distribution/i, /distributor/i],
    weight: 0.85,
  },
  {
    type: "producer_agreement",
    patterns: [/producer agreement/i, /production agreement/i, /\bproducer\b.*\bagreement\b/i],
    weight: 0.85,
  },
  {
    type: "license",
    patterns: [/license agreement/i, /synchroni[sz]ation/i, /\blicen[sc]e\b/i],
    weight: 0.8,
  },
];

/**
 * Rule-based document classification (draft only; human may override later).
 */
export function classifyDocument(text: string, filename?: string): ClassificationResult {
  const corpus = `${filename || ""}\n${text}`.slice(0, 50000);
  let best: ClassificationResult = { documentType: "unknown", confidence: 0.25 };

  for (const rule of RULES) {
    let hits = 0;
    for (const p of rule.patterns) {
      if (p.test(corpus)) hits += 1;
    }
    if (hits === 0) continue;
    const confidence = Math.min(0.95, rule.weight * (0.7 + 0.15 * hits));
    if (confidence > best.confidence) {
      best = { documentType: rule.type, confidence };
    }
  }

  return best;
}

export function documentTypeLabel(type: string | null | undefined): string {
  if (!type) return DOCUMENT_TYPE_LABELS.unknown;
  return DOCUMENT_TYPE_LABELS[type as DocumentType] || type;
}
