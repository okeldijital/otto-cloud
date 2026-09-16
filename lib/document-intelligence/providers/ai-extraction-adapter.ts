import { complete as completeAi } from "@/lib/ai-provider";
import {
  EXTRACTION_FIELD_DEFS,
  EXTRACTION_PROMPT_VERSION,
  type DocumentType,
  DOCUMENT_TYPES,
} from "../constants";
import { clampConfidence, computeOverallConfidence } from "../confidence";
import { deterministicExtractionProvider } from "./deterministic-extraction";
import type {
  ExtractedFieldDraft,
  ExtractionProvider,
  ExtractionProviderResult,
} from "./extraction-provider";

/**
 * LLM-backed extraction via platform AIProvider (openai / anthropic / deterministic).
 * Falls back to deterministic rules if JSON parse fails or provider is deterministic.
 */
export class AiExtractionAdapter implements ExtractionProvider {
  readonly name = "ai-adapter";

  async extract(params: {
    text: string;
    filename?: string;
    promptVersion: string;
  }): Promise<ExtractionProviderResult> {
    const promptVersion = params.promptVersion || EXTRACTION_PROMPT_VERSION;
    const systemPrompt = [
      "You extract structured metadata from music industry legal contracts.",
      "Return ONLY valid JSON (no markdown) with this shape:",
      JSON.stringify(
        {
          documentType: "recording_agreement|publishing_agreement|distribution_agreement|producer_agreement|nda|license|unknown",
          documentTypeConfidence: 0.0,
          fields: EXTRACTION_FIELD_DEFS.map((f) => ({
            fieldKey: f.key,
            value: "string or null",
            confidence: 0.0,
          })),
        },
        null,
        2
      ),
      "All values are drafts for human review. Prefer null over guessing.",
    ].join("\n");

    const userPrompt = [
      `Filename: ${params.filename || "unknown.pdf"}`,
      `Prompt version: ${promptVersion}`,
      "Document text:",
      params.text.slice(0, 24000),
    ].join("\n\n");

    try {
      const completion = await completeAi({
        systemPrompt,
        userPrompt,
        temperature: 0.1,
        maxTokens: 1500,
      });

      if (completion.provider === "deterministic") {
        const det = await deterministicExtractionProvider.extract(params);
        return {
          ...det,
          rawResponse: {
            ...(det.rawResponse as object),
            aiNote: "AI provider not configured; used deterministic extraction",
          },
        };
      }

      const parsed = parseJsonObject(completion.text);
      if (!parsed) {
        const det = await deterministicExtractionProvider.extract(params);
        return {
          ...det,
          provider: completion.provider,
          model: completion.model,
          rawResponse: {
            parseError: true,
            rawText: completion.text.slice(0, 4000),
            fallback: "deterministic",
          },
        };
      }

      const documentType = normalizeType(parsed.documentType);
      const documentTypeConfidence = clampConfidence(
        Number(parsed.documentTypeConfidence ?? 0.5)
      );
      const fields = mapFields(parsed.fields);
      const overall = computeOverallConfidence(fields);

      return {
        provider: completion.provider,
        model: completion.model,
        rawResponse: parsed,
        documentType,
        documentTypeConfidence,
        fields,
        overallConfidence: overall,
      };
    } catch (error) {
      const det = await deterministicExtractionProvider.extract(params);
      return {
        ...det,
        rawResponse: {
          error: error instanceof Error ? error.message : String(error),
          fallback: "deterministic",
        },
      };
    }
  }
}

function parseJsonObject(text: string): any | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeType(raw: unknown): DocumentType {
  const s = String(raw || "unknown")
    .toLowerCase()
    .replace(/\s+/g, "_");
  if ((DOCUMENT_TYPES as readonly string[]).includes(s)) return s as DocumentType;
  return "unknown";
}

function mapFields(raw: unknown): ExtractedFieldDraft[] {
  const byKey = new Map<string, { value: string | null; confidence: number }>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const key = String((item as any).fieldKey || (item as any).key || "");
      if (!key) continue;
      const value = (item as any).value;
      byKey.set(key, {
        value: value == null || value === "" ? null : String(value).slice(0, 500),
        confidence: clampConfidence(Number((item as any).confidence ?? 0.4)),
      });
    }
  }

  return EXTRACTION_FIELD_DEFS.map((def) => {
    const hit = byKey.get(def.key);
    return {
      fieldKey: def.key,
      fieldLabel: def.label,
      value: hit?.value ?? null,
      confidence: hit?.confidence ?? 0.15,
    };
  });
}

export const aiExtractionProvider = new AiExtractionAdapter();
