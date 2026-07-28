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

---

## Milestone 2.3 — PDF Viewing

| Field | Value |
|-------|--------|
| Status | **Complete** |
| Report | [milestone-2.3-complete.md](./milestone-2.3-complete.md) |

- Reusable `components/documents/pdf/*` viewer
- Zoom, navigate, search, rotate, print, download, fullscreen
- Stream download for viewer; no R2 from browser
- Contract Repository → View integration

---

## Milestone 3.0 — Document Intelligence Foundation

| Field | Value |
|-------|--------|
| Status | **Complete** |
| Report | [milestone-3.0-complete.md](./milestone-3.0-complete.md) |
| ADR | [adr-011-document-intelligence.md](./adr-011-document-intelligence.md) |

- Async extraction jobs (OCR → text → classify → AI draft)
- Confidence + raw persistence + verification draft shell
- Repository Extract / AI draft UX

---

## Milestone 3.1 — Human Verification Workspace

| Field | Value |
|-------|--------|
| Status | **Complete** |
| Report | [milestone-3.1-complete.md](./milestone-3.1-complete.md) |
| ADR | [adr-012-human-verification.md](./adr-012-human-verification.md) |

- Field accept/edit/reject/reset + bulk
- Verified layer promotion on complete
- Session versioning + reopen
- Full workspace UI

---

## Milestone 3.2 — Verified Contract Domain

| Field | Value |
|-------|--------|
| Status | **Complete** |
| Report | [milestone-3.2-complete.md](./milestone-3.2-complete.md) |
| ADR | [adr-013-verified-contract-domain.md](./adr-013-verified-contract-domain.md) |

- Normalized VerifiedContract domain + provenance
- Idempotent promotion + domain events
- Read APIs for platform consumers
- Contract Detail Verified tab

---

## Milestone 4.0 — Relationship Discovery & Linking

| Field | Value |
|-------|--------|
| Status | **Complete** |
| Report | [milestone-4.0-complete.md](./milestone-4.0-complete.md) |
| ADR | [adr-014-contract-relationships.md](./adr-014-contract-relationships.md) |

- Polymorphic relationships + discovery from verified domain
- Accept/reject/manual link UI
- Platform relationship events

---

## Milestone 4.1 — Contract Lifecycle Management

| Field | Value |
|-------|--------|
| Status | **Complete** |
| Report | [milestone-4.1-complete.md](./milestone-4.1-complete.md) |
| ADR | [adr-015-contract-lifecycle.md](./adr-015-contract-lifecycle.md) |
| Architecture | [contract-lifecycle-architecture.md](../../architecture/contract-lifecycle-architecture.md) |

- [x] Lifecycle model + validated state transitions
- [x] Key dates (source, verification state, timezone)
- [x] Renewal model (manual; no auto-execution)
- [x] Amendment registration
- [x] Supersession (history preserved)
- [x] Append-only operational timeline
- [x] Platform lifecycle events
- [x] APIs: lifecycle, amendments, timeline, lifecycle-summary
- [x] Contract Detail tabs + dashboard widgets
- [x] Unit tests (`npm run test:lifecycle`)
- [x] No AI

### Explicitly not in 4.1

Email, calendar sync, AI reminders, workflow automation, approval routing, e-sign, royalty/release automation.
