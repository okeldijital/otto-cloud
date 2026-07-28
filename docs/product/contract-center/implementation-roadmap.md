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

---

## Milestone 4.2 — Platform Event & Notification Framework

| Field | Value |
|-------|--------|
| Status | **Complete** (platform milestone) |
| Report | [../platform/milestone-4.2-complete.md](../platform/milestone-4.2-complete.md) |
| ADRs | [ADR-016](../platform/adr-016-platform-event-framework.md), [ADR-017](../platform/adr-017-notification-architecture.md) |

- [x] Platform event bus + registry + store + dispatcher
- [x] Subscribers, retry, DLQ, replay
- [x] Notification + preferences + reminders (in-app)
- [x] Contract Center publishes through platform bus
- [x] Monitoring dashboard widgets
- [x] Tests (`test:platform-events`, `test:notifications`)
- [x] No email/SMS/push

---

## Milestone 4.2A — Event Contracts & Schema Validation

| Field | Value |
|-------|--------|
| Status | **Complete** (platform refinement) |
| Report | [../platform/milestone-4.2a-complete.md](../platform/milestone-4.2a-complete.md) |
| Architecture | [event-contracts.md](../../architecture/event-contracts.md) |

- [x] Formal payload contracts (semver) on all registered events
- [x] Dispatcher pre-persist validation
- [x] organizationId inject + optional timestamp defaults
- [x] Registry JSON Schema export
- [x] Tests (`npm run test:event-contracts`)

---

## Milestone 5.0 — Release Workspace Contract Integration

| Field | Value |
|-------|--------|
| Status | **Complete** |
| Report | [../release-workspace/milestone-5.0-complete.md](../release-workspace/milestone-5.0-complete.md) |
| ADR | [ADR-018](../release-workspace/adr-018-release-contract-integration.md) |

- [x] Read model projections (no SoT duplication)
- [x] Relationship + lifecycle + verified consumption
- [x] Platform event subscriber + replay rebuild
- [x] Health derivation, unified timeline
- [x] Read-only APIs + Contracts workspace section
- [x] Dashboard widgets + search
- [x] Tests (`npm run test:release-contracts`)
- [x] No write / royalty / AI

---

## Platform Projection Framework (post-5.0)

| Field | Value |
|-------|--------|
| Status | **Complete** |
| ADR | [ADR-019](../platform/adr-019-platform-projections.md) |
| Architecture | [platform-projections.md](../../architecture/platform-projections.md) |

- [x] ProjectionEngine / Registry / Store / Replayer / Subscriber / Metrics
- [x] Release Workspace as reference projection definition
- [x] Rebuild + replay API
- [x] Tests (`npm run test:projections`)

---

## Milestone 6.0 — Rights Management Foundation

| Field | Value |
|-------|--------|
| Status | **Complete** |
| ADR | [ADR-020](../rights/adr-020-rights-domain.md) |
| Report | [milestone-6.0-complete.md](../rights/milestone-6.0-complete.md) |

- [x] Rights domain + registry
- [x] Promotion from verified contracts only
- [x] Human review (approve/reject)
- [x] Lifecycle + timeline + provenance
- [x] Platform events `rights.*`
- [x] Search + dashboard + APIs + UI
- [x] Tests (`npm run test:rights`)
- [x] No royalties / payments / AI

---

## Milestone 7.0 — Royalty Entitlement Foundation

| Field | Value |
|-------|--------|
| Status | **Complete** |
| ADR | [ADR-021](../royalties/adr-021-royalty-entitlement-domain.md) |
| Report | [milestone-7.0-complete.md](../royalties/milestone-7.0-complete.md) |

- [x] Entitlement registry + promotion from approved Rights only
- [x] Human review, allocation/split validation, ownership, restrictions
- [x] Lifecycle + timeline + provenance
- [x] Platform events `royalties.entitlement.*`
- [x] APIs + UI
- [x] Tests (`npm run test:royalty-entitlements`)
- [x] No calculations / DSP / payments

---

## Platform Milestone A.0 — Identity Platform Foundation

| Field | Value |
|-------|--------|
| Status | **Complete (foundation)** |
| ADR | [ADR-022](../platform/adr-022-identity-access-management.md) |
| Report | [milestone-iam-a0-complete.md](../platform/milestone-iam-a0-complete.md) |

- [x] New IAM schema (`iam_*`) parallel to legacy
- [x] `lib/platform/identity` package structure
- [x] Argon2id + token + secret-box crypto
- [x] Permission catalog + PermissionSet
- [x] Identity event names on platform bus
- [x] ADRs 022–027 + architecture docs
- [x] Tests (`npm run test:identity`)
- [ ] A.1 Login/logout (next)
- [ ] A.2–A.10 (planned)
