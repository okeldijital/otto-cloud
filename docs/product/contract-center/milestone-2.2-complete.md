# Milestone 2.2 Complete — Repository UI

| Field | Value |
|-------|--------|
| Version | 1.0 |
| Status | Implemented |
| Date | 2026-07-28 |
| Depends on | Document Platform 2.1 / 2.1A / 2.1B |

---

## Implemented features

| Feature | Detail |
|---------|--------|
| Document Repository | Full repository experience on Contract detail → Documents tab |
| Document list | Filename, type, size, uploaded, uploaded by, status, SHA-256 |
| Upload | Drag/drop + browse + dialog; sequential multi-file ready |
| Upload progress | Progress bar, cancel, retry, dismiss, ARIA live region |
| Download | Signed URL via `GET .../documents/:documentId/download` |
| Replace | New immutable document + new relationship; previous preserved |
| Soft delete | Confirmation dialog; uses existing DELETE API |
| Filtering | Filename, type, status, date range, uploaded by |
| Sorting | Newest/oldest, name, size, uploader |
| Pagination | Client-side pages of 25 for large repositories |
| Empty / loading / error | Skeleton list, empty CTAs, friendly errors + retry |
| Accessibility | Keyboard dropzone, labels, status dots + text, focusable dialogs |
| Responsive | Stacked metadata + actions on mobile |

### Components

```
components/contracts/repository/
  DocumentRepository.tsx
  DocumentList.tsx / DocumentRow.tsx
  UploadDialog / UploadDropzone / UploadProgress
  RepositoryToolbar / RepositoryFilters / RepositoryEmptyState
  DeleteDialog / ReplaceDialog
  repositoryUtils.ts (filter/sort/paginate/errors)
```

### Architecture compliance

```
UI → ContractDocumentService (HTTP)
   → DocumentService
   → StorageProvider
   → CloudflareR2Provider
```

- No direct StorageProvider use from UI.
- No Document Platform redesign.
- No PDF viewer / OCR / AI.

### Thin API addition (not platform redesign)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/contracts/:id/documents/:documentId/download` | Signed download URL for repository |

List supports `?includeDeleted=true|false` for status filters.

---

## Known limitations

1. **Uploader display names** — API returns `uploadedBy` id; names require future user join enrichment.
2. **Client-side filter/sort/page** — fine for hundreds of docs; server-side query if volumes grow.
3. **Replace does not auto-soft-delete** the previous document — both remain (per immutability / “preserve previous”).
4. **No PDF viewing** — Milestone 2.3.
5. **No multi-file parallel upload** — sequential by design for this milestone.
6. **React component tests** — pure utils tested via `npm run test:repository`; no browser RTL harness in repo.

---

## Future milestones

| Milestone | Focus |
|-----------|--------|
| **2.3** | Embedded PDF viewer (zoom, search, print) |
| **3.x** | Document intelligence (OCR, extraction, AI) |

---

## Success criteria

- [x] Browse repository  
- [x] Upload + progress  
- [x] Download (signed URL)  
- [x] Replace without overwrite  
- [x] Soft delete  
- [x] Filter / sort  
- [x] Empty / loading / error states  
- [x] Accessibility & responsive layout  
- [x] Document Platform unchanged (except thin download facade)  
- [x] Tests (`npm run test:repository`)  
- [x] Typecheck clean  
