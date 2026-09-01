import {
  EXTRACTION_FIELD_DEFS,
  EXTRACTION_PROMPT_VERSION,
  type DocumentType,
} from "../constants";
import { classifyDocument } from "../classification";
import { clampConfidence, computeOverallConfidence } from "../confidence";
import type {
  ExtractedFieldDraft,
  ExtractionProvider,
  ExtractionProviderResult,
} from "./extraction-provider";

/**
 * Deterministic / regex extraction fallback (no external LLM required).
 * Always produces draft fields with verificationState implied as draft.
 */
export class DeterministicExtractionProvider implements ExtractionProvider {
  readonly name = "deterministic";

  async extract(params: {
    text: string;
    filename?: string;
    promptVersion: string;
  }): Promise<ExtractionProviderResult> {
    const text = params.text || "";
    const classification = classifyDocument(text, params.filename);
    const fields = extractFields(text, params.filename);
    const overall = computeOverallConfidence(fields);

    return {
      provider: this.name,
      model: "rules-v1",
      rawResponse: {
        mode: "deterministic",
        promptVersion: params.promptVersion || EXTRACTION_PROMPT_VERSION,
        classification,
        fieldCount: fields.length,
      },
      documentType: classification.documentType,
      documentTypeConfidence: classification.confidence,
      fields,
      overallConfidence: overall,
    };
  }
}

function extractFields(text: string, filename?: string): ExtractedFieldDraft[] {
  const title =
    firstMatch(text, /(?:agreement|contract)\s*(?:title)?[:\s]+([^\n]{5,120})/i) ||
    (filename ? filename.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ") : null);

  const effective =
    firstMatch(text, /effective\s+date[:\s]+([A-Za-z0-9,\s\/\-]{4,40})/i) ||
    firstMatch(text, /commenc(?:es|ing)\s+on[:\s]+([A-Za-z0-9,\s\/\-]{4,40})/i);

  const expiration =
    firstMatch(text, /expir(?:ation|y)\s+date[:\s]+([A-Za-z0-9,\s\/\-]{4,40})/i) ||
    firstMatch(text, /terminat(?:es|ion)\s+on[:\s]+([A-Za-z0-9,\s\/\-]{4,40})/i);

  const parties =
    firstMatch(text, /parties[:\s]+([^\n]{5,200})/i) ||
    firstMatch(text, /between\s+(.+?)\s+and\s+(.+?)(?:\.|\n)/i);

  const releaseTitle =
    firstMatch(text, /(?:release|album|ep|single|work)\s*(?:title|name)?[:\s]+([^\n]{2,160})/i) ||
    firstMatch(text, /(?:in connection with|relating to|concerning)\s+(?:the\s+)?(?:release|album|ep|single|work)\s+["“]?([^"”\n]{2,160})["”]?/i);

  const governing =
    firstMatch(text, /governing\s+law[:\s]+([^\n]{3,80})/i) ||
    firstMatch(text, /laws?\s+of\s+the\s+state\s+of\s+([A-Za-z\s]{3,40})/i);

  const reference =
    firstMatch(text, /(?:contract|agreement|reference)\s*(?:no|number|#)[:\s]*([A-Z0-9\-\/]{3,40})/i);

  const currency = firstMatch(text, /\b(USD|EUR|GBP|ZAR|AUD|CAD)\b/);
  const territory =
    firstMatch(text, /territory[:\s]+([^\n]{3,80})/i) ||
    firstMatch(text, /throughout\s+the\s+([^\n]{3,40})/i);

  const term = firstMatch(text, /\bterm[:\s]+([^\n]{5,120})/i);
  const rights = firstMatch(text, /\brights?\s+granted[:\s]+([^\n]{5,200})/i);
  const obligations = firstMatch(text, /\bobligations?[:\s]+([^\n]{5,200})/i);

  const raw: Record<string, { value: string | null; confidence: number }> = {
    title: { value: clean(title), confidence: title ? 0.55 : 0.15 },
    effective_date: { value: clean(effective), confidence: effective ? 0.6 : 0.1 },
    expiration_date: { value: clean(expiration), confidence: expiration ? 0.55 : 0.1 },
    parties: { value: clean(parties), confidence: parties ? 0.5 : 0.1 },
    release_title: { value: clean(releaseTitle), confidence: releaseTitle ? 0.5 : 0.1 },
    governing_law: { value: clean(governing), confidence: governing ? 0.55 : 0.1 },
    reference_number: { value: clean(reference), confidence: reference ? 0.65 : 0.1 },
    currency: { value: clean(currency), confidence: currency ? 0.7 : 0.1 },
    territory: { value: clean(territory), confidence: territory ? 0.5 : 0.1 },
    term: { value: clean(term), confidence: term ? 0.45 : 0.1 },
    rights: { value: clean(rights), confidence: rights ? 0.4 : 0.1 },
    obligations: { value: clean(obligations), confidence: obligations ? 0.4 : 0.1 },
  };

  return EXTRACTION_FIELD_DEFS.map((def) => {
    const hit = raw[def.key] || { value: null, confidence: 0.1 };
    return {
      fieldKey: def.key,
      fieldLabel: def.label,
      value: hit.value,
      confidence: clampConfidence(hit.confidence),
      // sortOrder applied at persist
    };
  });
}

function firstMatch(text: string, re: RegExp): string | null {
  const m = text.match(re);
  if (!m) return null;
  if (m[2]) return `${m[1]} and ${m[2]}`;
  return m[1] || m[0] || null;
}

function clean(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t.length ? t.slice(0, 500) : null;
}

export const deterministicExtractionProvider = new DeterministicExtractionProvider();
