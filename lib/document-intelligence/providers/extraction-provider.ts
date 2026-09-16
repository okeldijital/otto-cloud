import type { DocumentType } from "../constants";

/**
 * AI extraction provider abstraction.
 */

export interface ExtractedFieldDraft {
  fieldKey: string;
  fieldLabel: string;
  value: string | null;
  confidence: number;
}

export interface ExtractionProviderResult {
  provider: string;
  model?: string;
  rawResponse: unknown;
  documentType: DocumentType;
  documentTypeConfidence: number;
  fields: ExtractedFieldDraft[];
  overallConfidence: number;
}

export interface ExtractionProvider {
  readonly name: string;
  extract(params: {
    text: string;
    filename?: string;
    promptVersion: string;
  }): Promise<ExtractionProviderResult>;
}
