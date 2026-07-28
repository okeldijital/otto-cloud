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

## [Platform 4.2.0] — 2026-07-28 — Platform Event & Notification Framework

Cross-module platform milestone (not Contract Center–owned). Contract Center is the **first producer**.

### Added

- Platform event bus: registry, store, dispatcher, subscribers, retry, DLQ, replay, metrics.
- Notification framework: in-app notifications, preferences, reminders (schedule only).
- APIs under `/api/platform/events`, `/api/notifications`, `/api/notification-preferences`, `/api/reminders`.
- Contract Center dual-writes lifecycle / relationship / verified / verification / document events to the bus.
- ADR-016, ADR-017, architecture docs, `npm run test:platform-events`, `npm run test:notifications`.

### Principle

Modules publish and subscribe; notifications are subscribers, not event owners. No email/SMS/push.

---

## [4.1.0] — 2026-07-28 — Contract Lifecycle Management

### Added

- Lifecycle domain: status engine, key dates, renewals, amendments, supersession, timeline, events.
- APIs: `GET/PATCH /contracts/:id/lifecycle`, `GET/POST /contracts/:id/amendments`, `GET /contracts/:id/timeline`, `GET /contracts/lifecycle-summary`.
- Contract Detail tabs: **Lifecycle**, **Timeline**, **Amendments**.
- Dashboard lifecycle summary widgets.
- Platform events: Activated, Expired, RenewalDue, Renewed, Superseded, Amended, LifecycleStatusChanged.
- ADR-015, contract-lifecycle-architecture, milestone-4.1-complete.
- `npm run test:lifecycle`.

### Principle

Deterministic, auditable, event-driven lifecycle — no AI, no automatic renewals. Future services consume lifecycle events.

---

## [4.0.0] — 2026-07-28 — Relationship Discovery & Linking

### Added

- Polymorphic contract relationships + suggestions + decisions + history.
- Matching (exact / normalized / alias) and discovery from verified contracts.
- APIs for relationships and suggestions (accept/reject/manual/search).
- Contract Detail **Relationships** tab.
- Platform events: Suggested, Created, Updated, Removed, Rejected.
- ADR-014, relationship-architecture, milestone-4.0-complete.
- `npm run test:relationships`.

### Principle

Intelligence suggests; only users create links.

---

## [3.2.0] — 2026-07-28 — Verified Contract Domain

### Added

- Normalized verified domain: contracts, parties, terms, rights, obligations, territories, dates.
- Idempotent promotion pipeline on verification complete.
- Platform events (`VerifiedContractCreated` / `Updated` / `Reverified`, party events).
- Read APIs: `/contracts/:id/verified`, `/parties`, `/history`.
- Contract Detail **Verified** tab (read-only).
- ADR-013, verified-contract-architecture, milestone-3.2-complete.
- `npm run test:verified-contract`.

### Integration rule

Downstream modules must use Verified Contract APIs — not extraction or draft layers.

---

## [3.1.0] — 2026-07-28 — Human Verification Workspace

### Added

- Verification sessions, verified field layer, history, decisions.
- APIs: get verification, field update, bulk update, complete, reopen.
- Full 3-column workspace (PDF · draft fields · verified values).
- Confidence bands, field filters, progress, viewer-only permissions.
- ADR-012, verification-architecture, milestone-3.1-complete.
- `npm run test:verification`.

### Guarantees

- AI drafts immutable; verified data separate; human confirmation required.

---

## [3.0.0] — 2026-07-28 — Document Intelligence Foundation

### Added

- Intelligence layer package `lib/document-intelligence` (OCR + extraction providers, jobs, audit).
- Schema: extraction jobs, extractions, fields, verification drafts.
- APIs: start / status / result / retry extraction.
- UI: extraction status badge, Extract action, intelligence workspace shell with draft fields + PDF.
- Docs: ADR-011, ai-provider-architecture, ocr-architecture, milestone-3.0-complete.
- `npm run test:intelligence`.

### Guarantees

- Nothing auto-verified; human review mandatory.
- Document Platform and PDF Viewer unchanged.

---

## [2.3.0] — 2026-07-28 — PDF Viewing

### Added

- Reusable PDF viewer suite under `components/documents/pdf/` (react-pdf / PDF.js).
- Features: zoom, fit width/page, page navigation, search, rotate, print, download, fullscreen.
- Integration: Contract Repository **View** opens viewer; repository filters/list state preserved on close.
- Download stream mode: `GET .../download?format=stream` for authenticated viewer load without R2 CORS exposure.
- [milestone-2.3-complete.md](./milestone-2.3-complete.md), `npm run test:pdf`.

### Not included (by design)

- OCR, AI, annotations, redlining, semantic search, content indexing.

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
