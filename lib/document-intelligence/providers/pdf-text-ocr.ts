import type { OcrPageResult, OcrProvider, OcrResult } from "./ocr-provider";
import { NATIVE_TEXT_THRESHOLD_PER_PAGE } from "../constants";

/**
 * Native PDF text extraction with a self-hosted OCR worker fallback for
 * scanned/image PDFs. No hosted OCR API is required.
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
      return { provider: this.name, pages, fullText, ocrApplied: false };
    }

    const workerUrl = process.env.OCR_WORKER_URL?.replace(/\/$/, "");
    if (!workerUrl) {
      throw new Error(
        "OCR worker is not configured. Set OCR_WORKER_URL for scanned PDFs."
      );
    }

    const response = await fetch(`${workerUrl}/ocr`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.OCR_WORKER_TOKEN
          ? { authorization: `Bearer ${process.env.OCR_WORKER_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        mimeType: params.mimeType,
        filename: params.filename,
        data: params.buffer.toString("base64"),
      }),
      signal: AbortSignal.timeout(Number(process.env.OCR_WORKER_TIMEOUT_MS || 120_000)),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `OCR worker failed (${response.status})${detail ? `: ${detail.slice(0, 500)}` : ""}`
      );
    }

    const result = (await response.json()) as OcrResult;
    if (!result.ocrApplied || !Array.isArray(result.pages)) {
      throw new Error("OCR worker returned an invalid result");
    }

    return result;
  }
}

async function extractPdfPages(buffer: Buffer): Promise<OcrPageResult[]> {
  try {
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
    return [{ pageNumber: 1, text: "" }];
  }
}

export const defaultOcrProvider = new PdfTextOcrProvider();
