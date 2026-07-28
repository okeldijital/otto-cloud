# Contract Center — Implementation Roadmap

**Status:** Baseline  
**Last updated:** 2026-07-28

Operational tracking of implementation work. Product sequencing remains in [ROADMAP.md](./ROADMAP.md).

---

## Milestone 2.1 — Storage Foundation

| Field | Value |
|-------|--------|
| Status | **Implemented** (code complete — apply migration + configure R2 for runtime) |
| Spec version | 1.0 Approved |
| ADR | [adr-008-document-storage.md](./adr-008-document-storage.md) |
| Completion report | [milestone-2.1-complete.md](./milestone-2.1-complete.md) |

### Delivered

- [x] Document entity (`document_assets`)
- [x] ContractDocument relationship (`contract_document_relations`)
- [x] StorageProvider abstraction
- [x] CloudflareR2Provider
- [x] DocumentService (validation, checksum, upload, link, audit, activity)
- [x] Repositories (persistence only)
- [x] API: `POST/GET /api/contracts/:id/documents`, `DELETE .../:documentId`
- [x] Soft delete
- [x] Organization isolation
- [x] Contract detail Documents section (no PDF viewer)
- [x] Unit tests (`npm run test:documents`)

### Explicitly not in 2.1

OCR, AI, PDF viewer, parsing, search-in-document, previews, virus scan, hard delete.

---

## Milestone 2.1A — Storage Architecture Validation

| Field | Value |
|-------|--------|
| Status | **Complete** |
| Report | [milestone-2.1-review.md](./milestone-2.1-review.md) |
| Technical | [storage-validation.md](../../architecture/storage-validation.md) |
| Critical defects | None |
| Decision | Accept 2.1 as Document Platform Baseline → extract generics (2.1B) → 2.2 |

---

## Milestone 2.1B — Document Platform Extraction

| Field | Value |
|-------|--------|
| Status | **Complete** |
| Reference | [document-platform.md](../../architecture/document-platform.md) |
| Change type | Refactor only — APIs and behavior unchanged |
| Decision | Platform reusable; proceed to 2.2 |

---

## Milestone 2.2 — Repository UI

| Field | Value |
|-------|--------|
| Status | **Complete** |
| Report | [milestone-2.2-complete.md](./milestone-2.2-complete.md) |

- Document repository UI (list, upload, progress, download, replace, soft delete)
- Filter / sort / pagination
- Empty, loading, error, a11y, responsive
- Thin download API only; Document Platform unchanged

## Milestone 2.3 — PDF Viewing

Embedded viewer only after 2.2.

## Milestone 3 — Document Intelligence

OCR → parsing → extraction → AI draft → verification.
