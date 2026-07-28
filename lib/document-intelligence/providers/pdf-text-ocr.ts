import type { OcrPageResult, OcrProvider, OcrResult } from "./ocr-provider";
import { NATIVE_TEXT_THRESHOLD_PER_PAGE } from "../constants";

/**
 * Deterministic text/OCR provider using PDF.js text layer.
 * Native PDFs: extract embedded text (OCR skipped when density is high).
 * Scanned/image PDFs: low density → ocrApplied=true with best-effort extract
 * (placeholder for Google Vision / Textract / Tesseract).
 */
export class PdfTextOcrProvider implements OcrProvider {
  readonly name = "pdfjs-text";

  async extractText(params: {
    buffer: Buffer;
    mimeType: string;
    filename?: string;
  }): Promise<OcrResult> {
    const pages = await extractPdfPages(params.buffer);
    const fullText = pages.map((p) => p.text).join("\n\n");
    const pageCount = Math.max(1, pages.length);
    const density = fullText.replace(/\s+/g, "").length / pageCount;
    const ocrApplied = density < NATIVE_TEXT_THRESHOLD_PER_PAGE;

    return {
      provider: this.name,
      pages,
      fullText: fullText.trim(),
      ocrApplied,
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
