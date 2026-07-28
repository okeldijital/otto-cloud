# Contract Center — Product Roadmap

**Status:** Baseline  
**Last updated:** 2026-07-28

This roadmap is the product sequencing for Contract Center. Platform concerns (audit UUID migration, legacy schema deletion) are tracked under [`docs/platform/`](../../platform/README.md) and **do not** block Milestone 2.

---

## Milestone overview

| Milestone | Theme | Status |
|-----------|--------|--------|
| **M1** | Contract core (create, metadata, org scope, parties foundation) | In progress / parallel |
| **M2** | Document Repository (management only) | **Complete (2.1–2.3)** |
| **M3** | Document Intelligence → Verified Domain | **3.0–3.2 complete** |
| **M4** | Relationships, Lifecycle & Platform Events | **4.0–4.1 complete; 4.2 platform complete** |

---

## Milestone 2 — Document Repository

> **Original scope (single feature):** Document Repository  
> **Refinement:** Implement as **three phases**, not one monolithic feature.

**M2 goal:** Document management only — store, list, download, and view PDFs.  
**Explicitly out of M2:** OCR, AI extraction, drafting, verification.

### Phase 2.1 — Storage Foundation ✅

**Status:** Implemented (2026-07-28) — see [milestone-2.1-complete.md](./milestone-2.1-complete.md)

**Implement:**

- Document entity
- Upload API
- Storage abstraction
- Cloudflare R2 integration
- Immutable document storage
- Metadata extraction (filename, size, MIME type, checksum)

**Do not implement:**

- PDF rendering
- OCR
- AI

**Exit criteria**

- A document can be **uploaded** and **permanently associated** with a Contract.

**Delivered in code:** `lib/documents/*`, `document_assets` / `contract_document_relations`, contract document APIs, Documents section UI.

**2.1A validation (2026-07-28):** Architecture accepted as Document Platform Baseline — see [milestone-2.1-review.md](./milestone-2.1-review.md).

**2.1B extraction (2026-07-28):** Generic `lib/documents` + Contract facade `lib/contract-center` — see [document-platform.md](../../architecture/document-platform.md). Proceed to 2.2.

---

### Phase 2.2 — Repository UI ✅

**Status:** Implemented (2026-07-28) — see [milestone-2.2-complete.md](./milestone-2.2-complete.md)

**Implement:**

- Upload dialog
- Document list
- Download
- Replace (creates a **new** document record if applicable — immutability preserved)
- Delete restrictions
- File metadata display
- Upload progress
- Error handling

**Do not implement:**

- Embedded PDF viewer

**Exit criteria**

- Users can manage the document lifecycle for a contract without leaving the Contract Center UI (except viewing page content).

---

### Phase 2.3 — PDF Viewing ✅

**Status:** Implemented (2026-07-28) — see [milestone-2.3-complete.md](./milestone-2.3-complete.md)

**Implement:**

- Embedded viewer
- Zoom
- Search
- Page navigation
- Print
- Download
- Full-screen

**Do not implement:**

- OCR

The PDF is **simply displayed**.

**Exit criteria**

- Users can open a stored agreement in-app with standard reader controls.

---

### Milestone 2 complete workflow

After M2 (all three phases):

```
Create Contract
      ↓
Upload Signed Agreement
      ↓
Store Immutable Original
      ↓
View PDF
      ↓
Download PDF
```

---

## Milestone 3 — Document Intelligence

```
Upload
  ↓
OCR
  ↓
Parsing
  ↓
Entity Extraction
  ↓
AI Draft
  ↓
Verification
```

| Responsibility | Milestone |
|----------------|-----------|
| Document **management** | Milestone 2 |
| Document **intelligence** | Milestone 3 |

### Phase 3.0 — Foundation ✅

**Status:** Implemented (2026-07-28) — see [milestone-3.0-complete.md](./milestone-3.0-complete.md)

Jobs, OCR abstraction, text extract, classification, AI draft fields, confidence, raw storage, verification workspace shell. **No auto-verification.**

### Phase 3.1 — Human Verification ✅

**Status:** Implemented (2026-07-28) — see [milestone-3.1-complete.md](./milestone-3.1-complete.md)

Field-level accept/edit/reject, verified layer, session versioning, completion rules, full workspace UI.

### Phase 3.2 — Verified Contract Domain ✅

**Status:** Implemented (2026-07-28) — see [milestone-3.2-complete.md](./milestone-3.2-complete.md)

First-class VerifiedContract for platform consumers; promotion from verification complete; read APIs.

### Later 3.x (not started)

Clause library, risk scoring, summaries — consume Verified Contract APIs.

---

## Milestone 4 — Ecosystem linking & operations

### Phase 4.0 — Relationship Discovery ✅

**Status:** Implemented (2026-07-28) — see [milestone-4.0-complete.md](./milestone-4.0-complete.md)

Suggestions from verified contracts; human confirmation; polymorphic links to Artists, Releases, Works, Labels, etc.

### Phase 4.1 — Contract Lifecycle Management ✅

**Status:** Implemented (2026-07-28) — see [milestone-4.1-complete.md](./milestone-4.1-complete.md)

Status engine, key dates, renewals (manual), amendments, supersession, operational timeline, platform events, dashboard widgets. **No AI.** Future Notification / Calendar / Royalty / Release services consume lifecycle events.

### Phase 4.2 — Platform Event & Notification Framework ✅

**Status:** Implemented (2026-07-28) — **platform milestone** (not Contract Center–owned).  
See [milestone-4.2-complete.md](../platform/milestone-4.2-complete.md).

Platform event bus, registry, store, dispatcher, retry, DLQ, replay; notification framework (in-app only); reminder scheduling. Contract Center is the first producer. Future modules subscribe rather than poll.

---

## Platform dependencies (non-blocking for M2)

| Item | Relation to Contract Center |
|------|------------------------------|
| [Audit System UUID Migration](../../platform/work-items/audit-system-uuid-migration.md) | Platform; scheduled before production; **does not block M2** |
| [Legacy contract decommission](../../platform/legacy-contract-migration.md) | Parallel exit plan; legacy remains until AI / royalties / releases migrate |

---

## Principles

1. **Immutability** of signed originals (replace = new record / version, not silent overwrite).
2. **UUID org identity** for Contract Center; no module-local audit hacks.
3. **Clean phase boundaries** — no OCR/AI leakage into M2.
4. **Legacy coexistence** until the platform decommission plan reaches deletion stage.
)
