import type { OcrPageResult, OcrProvider, OcrResult } from "./ocr-provider";
import { NATIVE_TEXT_THRESHOLD_PER_PAGE } from "../constants";
import { openAiPdfOcrProvider } from "./openai-pdf-ocr";

/**
 * Native PDF text extraction with an OCR fallback for scanned/image PDFs.
 * The native path remains deterministic; OpenAI is invoked only when the
 * embedded text layer is insufficient and OCR is explicitly configured.
 */
export class PdfTextOcrProvider implements OcrProvider {
  readonly name = "pdfjs-text";

  async extractText(params: {
    buffer: Buffer;
    mimeType: string;
    filename?: string;
  }): Promise<OcrResult> {
    const pages = await extractPdfPages(params.buffer);
    const fullText = pages.map((p) => p.text).join("\n\n").trim();
    const pageCount = Math.max(1, pages.length);
    const density = fullText.replace(/\s+/g, "").length / pageCount;

    if (density >= NATIVE_TEXT_THRESHOLD_PER_PAGE) {
      return {
        provider: this.name,
        pages,
        fullText,
        ocrApplied: false,
      };
    }

    if (process.env.OPENAI_API_KEY) {
      return openAiPdfOcrProvider.extractText(params);
    }

    return {
      provider: this.name,
      pages,
      fullText,
      ocrApplied: false,
    };
  }
}

async function extractPdfPages(buffer: Buffer): Promise<OcrPageResult[]> {
  try {
    // Dynamic import — pdfjs-dist is already a dependency via react-pdf
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({
      data,
      useSystemFonts: true,
      isEvalSupported: false,
      useWorkerFetch: false,
    });
    const doc = await loadingTask.promise;
    const pages: OcrPageResult[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((it: any) => (typeof it.str === "string" ? it.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pages.push({ pageNumber: i, text });
    }
    return pages.length > 0 ? pages : [{ pageNumber: 1, text: "" }];
  } catch {
    // Corrupt or unsupported PDF — return empty page for pipeline error handling
    return [{ pageNumber: 1, text: "" }];
  }
}

export const defaultOcrProvider = new PdfTextOcrProvider();
