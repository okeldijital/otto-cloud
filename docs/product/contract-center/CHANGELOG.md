# Contract Center — Changelog

All notable product and engineering-documentation changes for **Contract Center** are recorded here.

This file is the **baseline** for Contract Center documentation as of 2026-07-28. Earlier work lived in root-level contract notes and architecture docs; from this date forward, product-facing decisions for Contract Center are tracked under `docs/product/contract-center/`.

Format: reverse chronological. Categories: **Added**, **Changed**, **Documented**, **Platform**.

---

## [Baseline] — 2026-07-28

### Documented

- Established Contract Center product documentation tree:
  - `docs/product/contract-center/README.md`
  - `docs/product/contract-center/ROADMAP.md`
  - `docs/product/contract-center/CHANGELOG.md` (this file)
- Marked existing engineering documentation as **baseline** for ongoing Contract Center work.

### Changed

- **Milestone 2 (Document Repository)** refined from a single feature into three phases:
  - **Phase 2.1** — Storage Foundation (entity, upload API, storage abstraction, R2, immutability, metadata)
  - **Phase 2.2** — Repository UI (list, upload, download, replace-as-new, delete rules, progress/errors)
  - **Phase 2.3** — PDF Viewing (embedded viewer controls; no OCR)
- Clarified separation of concerns:
  - Milestone 2 = document **management**
  - Milestone 3 = document **intelligence** (OCR → parsing → extraction → AI draft → verification)

### Platform (tracked outside Contract Center)

- Opened platform work item: **[Audit System UUID Migration](../../platform/work-items/audit-system-uuid-migration.md)**  
  Status: Scheduled · Priority: High · Owner: Platform · Target: Before Production  
  Rationale: `audit_logs` still uses int org ids (`parseInt` on UUID); must not be fixed as a Contract-module fork.
- Added formal **[Legacy Contract Schema Decommission Plan](../../platform/legacy-contract-migration.md)**  
  Documents exit path: Legacy tables → AI → Relationships → Royalties → Validation → Data migration → Read-only → Deletion.  
  Explicit: legacy remains while AI, royalties, and releases depend on it.

### Non-goals recorded

- Do not block Milestone 2 on audit UUID migration.
- Do not solve platform audit or legacy deletion inside the Contract module alone.
- Do not introduce OCR/AI in Milestone 2.

---

## Unreleased

_No additional unreleased entries._

---

## [2.2.0] — 2026-07-28 — Repository UI

### Added

- Contract Center **Document Repository** experience (Documents tab).
- Components: list, toolbar, filters, empty/loading states, upload dialog/dropzone/progress, replace & delete dialogs.
- Download via signed URLs: `GET /api/contracts/:id/documents/:documentId/download`.
- Replace flow (new immutable document + relationship; previous preserved).
- Metadata filter/sort/pagination; accessibility and responsive layouts.
- `npm run test:repository` for filter/sort/error helpers.
- [milestone-2.2-complete.md](./milestone-2.2-complete.md)

### Not included (by design)

- PDF viewer, OCR, AI, content search, previews, version diff.

---

## [2.1B] — 2026-07-28 — Document Platform Extraction

### Changed (refactor only — no user-visible behavior change)

- Extracted **platform** `DocumentService` (`uploadDocument`, `softDeleteDocument`) with zero Contract branching.
- Moved Contract linking into `lib/contract-center` (`ContractDocumentService`, relation repository, domain events).
- Split platform vs Contract DTOs and events (`DocumentUploaded` vs `ContractDocumentLinked`).
- Package layout: `lib/documents/{services,repositories,providers,dto,events,validation,types}` and `lib/contract-center/...`.
- HTTP routes unchanged (`/api/contracts/:id/documents`).

### Documented

- [`docs/architecture/document-platform.md`](../../architecture/document-platform.md)
- [`docs/architecture/storage-architecture.md`](../../architecture/storage-architecture.md)
- Orphan recovery strategy (detection / cleanup / retry / future reconciliation job)

---

## [2.1A] — 2026-07-28 — Storage Architecture Validation

### Documented

- Architecture validation milestone completed (no new user functionality).
- [`docs/architecture/storage-validation.md`](../../architecture/storage-validation.md) — full 14-point review.
- [`milestone-2.1-review.md`](./milestone-2.1-review.md) — product summary and recommendation.
- [`docs/architecture/technical-debt.md`](../../architecture/technical-debt.md) — closed 2.1 items; residual storage debt.

### Decision

- **No critical defects.** Milestone 2.1 accepted as **Document Platform Baseline**.
- **Proceed to Milestone 2.2 — Repository UI.**
- Storage fundamentals stable; further structural change requires a new ADR.

---

## [2.1.0] — 2026-07-28 — Storage Foundation

### Added

- Platform **Document** asset model (`document_assets`) — immutable, org-scoped, soft-deletable; no business FKs.
- **ContractDocument** relationship model (`contract_document_relations`).
- `DocumentService` + repositories + `StorageProvider` / `CloudflareR2Provider`.
- APIs:
  - `POST /api/contracts/:id/documents`
  - `GET /api/contracts/:id/documents`
  - `DELETE /api/contracts/:id/documents/:documentId` (soft delete)
- Contract detail **Documents** section (upload drag-and-drop, list metadata, soft delete).
- ADR-008 Document Storage Architecture.
- Unit tests: `npm run test:documents`.
- Completion report: `milestone-2.1-complete.md`.

### Changed

- Contract detail Documents tab no longer embeds a PDF viewer (viewer deferred to Milestone 2.3).
- Storage config / client initialization is lazy (import-safe without R2 env).

### Not included (by design)

- OCR, AI, PDF viewing, content parsing, file download UI, virus scan, hard blob deletion.
)
