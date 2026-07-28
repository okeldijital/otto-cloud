# Milestone 2.1A — Storage Architecture Validation Review

| Field | Value |
|-------|--------|
| **Product** | OTTO Contract Center / Platform Document storage |
| **Milestone** | 2.1A — Storage Architecture Validation |
| **Version** | 1.0 |
| **Status** | Complete |
| **Date** | 2026-07-28 |
| **Full technical report** | [`docs/architecture/storage-validation.md`](../../architecture/storage-validation.md) |

---

## Purpose

Validate the Document Platform delivered in Milestone 2.1 **before** Repository UI (2.2), PDF viewing (2.3), or intelligence (3.x) build on it.

This milestone introduced **no new user functionality**.

---

## Outcome

| Result | Detail |
|--------|--------|
| **Critical defects** | **None** |
| **Architecture** | Validated against ADR-008 |
| **Platform reuse** | Confirmed at schema level |
| **Recommendation** | **Proceed to Milestone 2.2** |

**Milestone 2.1 is accepted as the Document Platform Baseline.**

---

## Review summary (14 areas)

| # | Area | Verdict |
|---|------|---------|
| 1 | Document entity | **Pass** — storage-only fields; no business FKs |
| 2 | Relationship model | **Pass** — extensible via new relation tables only |
| 3 | StorageProvider | **Pass** — R2 isolated; service/repos clean |
| 4 | Upload lifecycle | **Pass with residual risk** — blob-before-DB orphans possible |
| 5 | Immutability | **Pass** — no overwrite path; replace = new record |
| 6 | Soft delete | **Pass** — DB flag only; blob retained |
| 7 | Security | **Pass with concerns** — MIME trust, RBAC granularity |
| 8 | Checksum | **Pass** — SHA-256, indexed, deterministic |
| 9 | API | **Pass** — POST/GET/DELETE documented |
| 10 | Performance | **Acceptable** — no N+1 on list; full-buffer upload |
| 11 | Cloudflare R2 | **Pass** — lazy init; ops defaults |
| 12 | Platform readiness | **Architecture ready**; module glue required |
| 13 | Technical debt | Updated — see architecture technical-debt |
| 14 | Spec compliance | ADR-008 **Fully Compliant** |

---

## Relationship extensibility (answer)

```
Contract → ContractDocumentRelation → Document
```

**Can Releases, Artists, Labels, Publishers, Organizations, Royalty Statements, and Marketing Assets use the same architecture without changing the Document schema?**

**Yes.** Add module-specific relationship tables and thin service/API entry points. Do **not** add `releaseId` / `artistId` / etc. onto `document_assets`.

---

## Residual risks (do not block 2.2)

1. **Transaction boundary** — document row + relation not in a single DB transaction; rare unlinked document possible. Blob may orphan if DB fails after R2 put.
2. **Contract-shaped service API** — `uploadForContract` etc.; extract generic platform helpers when a second module adopts storage.
3. **Legacy dual path** — `contract_documents` still exists alongside platform documents.
4. **Audit org UUID** — platform audit INT coercion (pre-existing; separate work item).
5. **Client MIME trust** — no magic-byte verification.

Tracked in [`docs/architecture/technical-debt.md`](../../architecture/technical-debt.md).

---

## Specification compliance

| Document | Compliance |
|----------|------------|
| ADR-008 | **Fully Compliant** |
| Product `architecture.md` | **Not Applicable** (missing) |
| Product `data-model.md` | **Not Applicable** (missing) |
| Platform `01-data-model.md` | **Partially Compliant** (legacy contracts docs not yet updated to list platform documents) |

---

## Recommendation

| Action | Decision |
|--------|----------|
| Commit Milestone 2.1 | **Yes** |
| Tag as Document Platform Baseline | **Yes** |
| Begin Milestone 2.2 — Repository UI | **Yes** |
| Redesign storage fundamentals | **No** |
| Code changes in 2.1A | **None** (no critical defect) |

Future structural changes to storage ownership, immutability, or provider boundaries require a **new ADR**.

---

## Baseline definition

As of this review, the following are considered **stable**:

- `document_assets` schema shape (storage metadata only)
- Relation-table pattern for business links
- `DocumentService` → `StorageProvider` → provider implementation stack
- Soft-delete semantics (no immediate blob removal)
- SHA-256 checksum as integrity metadata
- Contract document HTTP API envelope and routes

2.2+ should **build on** these, not reopen them without ADR.

---

## Next milestone

**Milestone 2.2 — Repository UI**

Expected focus: upload UX polish, signed download, replace-as-new-record flows, delete restrictions refinements — **still no OCR/AI**, and **no PDF viewer** until 2.3.
