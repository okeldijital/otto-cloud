# Milestone 2.3 Complete — PDF Viewing

| Field | Value |
|-------|--------|
| Version | 1.0 |
| Status | Implemented |
| Date | 2026-07-28 |
| Depends on | Document Platform 2.1–2.1B · Repository UI 2.2 |

---

## Viewer architecture

```
Document Repository (UI)
        ↓ Open Document
PDFViewerPanel
        ↓ authenticated stream
GET /api/contracts/:id/documents/:documentId/download?format=stream
        ↓ ContractDocumentService.getDownloadUrl
Document Platform signed URL (server-side fetch)
        ↓
Blob URL (browser only)
        ↓
PDFViewer (react-pdf / PDF.js)
```

- Viewer **never** talks to Cloudflare R2.
- Storage keys and buckets are **never** sent to the client.
- Presentation only — no OCR, AI, extraction, or annotations.

### Component suite (`components/documents/pdf/`)

| Component | Role |
|-----------|------|
| `PDFViewer` | Core render + toolbar wiring |
| `PDFViewerPanel` | Auth stream load + blob lifecycle |
| `PDFToolbar` | Zoom, fit, rotate, print, download, fullscreen, search |
| `PDFNavigation` | Prev/next, jump to page |
| `PDFSearch` | Client-side find next/prev + counts |
| `PDFLoading` / `PDFError` | States |
| `PDFFullscreen` | Fullscreen API wrapper |

Reusable by future modules (not under `contracts/`).

---

## Supported features

| Feature | Notes |
|---------|--------|
| Embedded view | Contract Documents tab → View |
| Zoom in/out | 50%–300% |
| Fit width / fit page | Container-based |
| Page navigation | Buttons, jump input, arrow keys |
| Search | Case-insensitive, client-side text layer scan |
| Rotate | ±90° |
| Print | Browser print via blob URL / iframe |
| Download | Existing signed URL JSON endpoint |
| Full screen | Fullscreen API; page/zoom state preserved in React state |
| Loading / error | Spinner, progress when available, retry + back |
| Responsive | Toolbar wraps; usable on narrow screens |
| Accessibility | Labels, live region for page/search, keyboard nav |

---

## Known limitations

1. **Search highlighting** — navigates to matching pages and reports counts; full-text yellow highlights depend on PDF.js text layer and may not flash individual glyphs.
2. **Fit page** — approximate using container width heuristic (not true page aspect measurement for every PDF).
3. **Worker CDN** — PDF.js worker loaded from `unpkg` (`pdfjs-dist`); offline environments need a local worker copy under `public/`.
4. **Popup print** — if blocked, falls back to hidden iframe print.
5. **Very large PDFs** — single-page render (not multi-page virtualized continuous scroll); page-by-page keeps memory lower than rendering all pages.
6. **Signed URL expiry mid-view** — stream is fetched once into a blob; session lasts for the open viewer without re-fetch until Retry.

---

## Performance observations

- Uses **one page at a time** via `react-pdf` `Page` to avoid painting entire documents.
- Document bytes loaded once into a blob URL (revoked on close).
- Search walks pages sequentially with `getTextContent` (acceptable for typical contract PDFs; may lag on 500+ page files).

---

## Tests

```bash
npm run test:pdf
npm run test:repository
npm run test:documents
```

---

## Success criteria

- [x] PDFs render  
- [x] Navigate / zoom / search / print / download / fullscreen  
- [x] Responsive + a11y basics  
- [x] Consumes Document Platform only  
- [x] No storage architecture / DB changes  
- [x] No AI / OCR / parsing  

---

## Next

**Milestone 3** — Document intelligence (OCR, extraction, AI draft, verification) as a separate concern. Do not fold intelligence into the viewer.
