/**
 * OCR provider abstraction — business logic must not bind to a specific engine.
 */

export interface OcrPageResult {
  pageNumber: number;
  text: string;
}

export interface OcrResult {
  provider: string;
  pages: OcrPageResult[];
  fullText: string;
  /** true when OCR engine was actually applied (vs native text path). */
  ocrApplied: boolean;
}

export interface OcrProvider {
  readonly name: string;
  /**
   * Extract text from a PDF (or image PDF) buffer.
   * Implementations may use Vision, Textract, Tesseract, etc.
   */
  extractText(params: {
    buffer: Buffer;
    mimeType: string;
    filename?: string;
  }): Promise<OcrResult>;
}
