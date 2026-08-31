import type { OcrPageResult, OcrProvider, OcrResult } from "./ocr-provider";

/**
 * OCR fallback for image/scanned PDFs.
 *
 * OpenAI's multimodal file input is used only when the native PDF text layer
 * is insufficient. The model is instructed to transcribe every page and emit
 * explicit page markers so the intelligence pipeline retains page boundaries.
 */
export class OpenAiPdfOcrProvider implements OcrProvider {
  readonly name = "openai-pdf-ocr";

  async extractText(params: {
    buffer: Buffer;
    mimeType: string;
    filename?: string;
  }): Promise<OcrResult> {
    if (params.mimeType !== "application/pdf") {
      throw new Error("OpenAI PDF OCR currently supports application/pdf only");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured for PDF OCR");
    }

    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    const model = process.env.OCR_AI_MODEL || process.env.AI_MODEL || "gpt-4o-mini";

    const response = await client.responses.create({
      model,
      temperature: 0,
      max_output_tokens: 20000,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: params.filename || "contract.pdf",
              file_data: `data:application/pdf;base64,${params.buffer.toString("base64")}`,
            },
            {
              type: "input_text",
              text: [
                "Transcribe this contract PDF exactly enough for downstream legal metadata extraction.",
                "This PDF may be scanned and may have no usable embedded text layer.",
                "Read the visual content of every page.",
                "Do not summarize, interpret, or omit clauses.",
                "Return plain text only.",
                "Start every page with a marker exactly like [PAGE 1], [PAGE 2], etc.",
                "Preserve names, dates, percentages, currency amounts, clause numbers, and signatures as text where legible.",
                "If a page is genuinely unreadable, emit [UNREADABLE PAGE] after its page marker.",
              ].join("\n"),
            },
          ],
        },
      ],
    });

    const text = response.output_text?.trim() || "";
    if (!text) {
      throw new Error("OpenAI PDF OCR returned no text");
    }

    const pages = parsePageMarkers(text);
    return {
      provider: this.name,
      pages,
      fullText: pages.map((page) => page.text).join("\n\n").trim(),
      ocrApplied: true,
    };
  }
}

function parsePageMarkers(text: string): OcrPageResult[] {
  const marker = /\[PAGE\s+(\d+)\]/gi;
  const matches = [...text.matchAll(marker)];

  if (matches.length === 0) {
    return [{ pageNumber: 1, text: text.trim() }];
  }

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? text.length : text.length;
    return {
      pageNumber: Number(match[1]),
      text: text.slice(start, end).trim(),
    };
  });
}

export const openAiPdfOcrProvider = new OpenAiPdfOcrProvider();
