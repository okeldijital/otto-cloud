import type { ExtractedFieldDraft } from "./providers/extraction-provider";

/**
 * Clamp confidence to [0, 1].
 */
export function clampConfidence(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Overall confidence = mean of field confidences (empty → 0).
 */
export function computeOverallConfidence(fields: ExtractedFieldDraft[]): number {
  if (!fields.length) return 0;
  const sum = fields.reduce((acc, f) => acc + clampConfidence(f.confidence), 0);
  return clampConfidence(sum / fields.length);
}

/**
 * Slightly reduce confidence when OCR was required (scan noise).
 */
export function adjustForOcr(confidence: number, ocrApplied: boolean): number {
  return clampConfidence(ocrApplied ? confidence * 0.9 : confidence);
}
