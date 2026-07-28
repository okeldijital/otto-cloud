# Milestone 3.0 Complete — Document Intelligence Foundation

| Field | Value |
|-------|--------|
| Version | 1.0 |
| Status | Implemented |
| Date | 2026-07-28 |
| ADR | [adr-011-document-intelligence.md](./adr-011-document-intelligence.md) |

---

## Pipeline

```
Upload (existing)
  → Start extraction (queue job)
  → OCR if required
  → Text extract + normalize
  → Classify document type
  → AI / deterministic field extraction
  → Persist raw + fields + confidence
  → Awaiting human verification
```

PDF remains the legal source. AI output is **never** auto-verified.

---

## Implemented

| Area | Detail |
|------|--------|
| Package | `lib/document-intelligence` |
| OCR | `OcrProvider` + `PdfTextOcrProvider` |
| Extraction | `ExtractionProvider` + AI adapter + deterministic fallback |
| Jobs | queued → running → completed / failed / retrying |
| Schema | `DocumentExtractionJob`, `DocumentExtraction`, `ExtractionField`, `VerificationDraft` |
| APIs | start, status, result, retry |
| UI | Extraction badge, Extract action, intelligence workspace (PDF + draft fields) |
| Audit | extraction.started/completed/failed, verification.begun |
| Activity | Document Extracted, Extraction Failed, Verification Pending |

### APIs

| Method | Path |
|--------|------|
| POST | `/api/contracts/:id/documents/:documentId/extractions` |
| GET | `/api/contracts/:id/documents/:documentId/extractions` |
| GET | `/api/contracts/:id/documents/:documentId/extractions/:extractionId` |
| POST | `.../extractions/:extractionId/retry` |
| POST | `.../extractions/jobs/:jobId/retry` |

### UI

- Repository: **Extract** + **AI draft** + status badge
- Page: `/contracts/[id]/intelligence/[documentId]` — viewer + verification shell

---

## Unchanged

- Document Platform storage (ADR-008)
- PDF Viewer (2.3)
- No clause library, risk scoring, auto-approval, AI chat

---

## Known limitations

1. In-process async jobs (`setImmediate`) — not a distributed worker queue.
2. OCR for true image scans is best-effort via PDF.js text density; cloud OCR providers not wired.
3. Verification workspace is **foundation only** — no field edit/accept APIs yet.
4. Requires DB migration applied.

---

## Tests

```bash
npm run test:intelligence
```

---

## Success criteria

- [x] Queue + job lifecycle  
- [x] OCR when required (density heuristic)  
- [x] Text extract + classify + AI draft fields  
- [x] Confidence + raw persistence  
- [x] Status visible; verification shell  
- [x] Nothing auto-verified  
- [x] Platform + viewer unchanged  
