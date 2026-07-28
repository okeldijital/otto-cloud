# OCR Architecture — Document Intelligence

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |

---

## Abstraction

```
DocumentIntelligenceService
        ↓
OcrProvider.extractText({ buffer, mimeType })
        ↓
PdfTextOcrProvider (pdfjs-text)
```

Future providers (Google Vision, Azure OCR, AWS Textract, Tesseract) implement the same interface.

---

## OCR decision

1. Extract embedded PDF text (PDF.js).
2. Compute printable character density per page.
3. If density &lt; threshold → `ocrRequired=true` / `ocrApplied=true` (scan path).
4. If density sufficient → native PDF path (OCR skipped).

Threshold: `NATIVE_TEXT_THRESHOLD_PER_PAGE` in `lib/document-intelligence/constants.ts`.

---

## Output

| Field | Description |
|-------|-------------|
| `pages[]` | Page number + text |
| `fullText` | Concatenated text |
| `ocrApplied` | Whether OCR path was used |
| `provider` | Engine name |

Text is **not interpreted** at this stage — classification and AI run after normalization.

---

## Non-goals

- Layout reconstruction beyond page boundaries
- Handwriting models
- Image deskew pipelines (provider-specific later)
