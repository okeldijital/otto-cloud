import type { OcrPageResult, OcrProvider, OcrResult } from "./ocr-provider";
import { NATIVE_TEXT_THRESHOLD_PER_PAGE } from "../constants";

/**
 * Intake OCR is intentionally page-scoped: automatic extraction only needs
 * the first page in the common contract-upload case. The source PDF remains
 * the authoritative document for later deep analysis.
 */
export class PdfTextOcrProvider implements OcrProvider {
  readonly name = "pdfjs-text";

  async extractText(params: {
    buffer: Buffer;
    mimeType: string;
    filename?: string;
  }): Promise<OcrResult> {
    const firstPage = await extractFirstPdfPage(params.buffer);
    const firstPageText = firstPage.text.trim();
    const density = firstPageText.replace(/\s+/g, "").length;

    if (density >= NATIVE_TEXT_THRESHOLD_PER_PAGE) {
      return {
        provider: this.name,
        pages: [firstPage],
        fullText: firstPageText,
        ocrApplied: false,
        documentPageCount: firstPage.documentPageCount,
      };
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
        pages: [1],
      }),
      signal: AbortSignal.timeout(
        Number(process.env.OCR_WORKER_TIMEOUT_MS || 120_000)
      ),
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

async function extractFirstPdfPage(
  buffer: Buffer
): Promise<OcrPageResult & { documentPageCount: number }> {
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
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const text = content.items
      .map((it: any) => (typeof it.str === "string" ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return { pageNumber: 1, text, documentPageCount: doc.numPages };
  } catch {
    return { pageNumber: 1, text: "", documentPageCount: 1 };
  }
}

export const defaultOcrProvider = new PdfTextOcrProvider();
