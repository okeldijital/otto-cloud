# Platform Technical Debt

**Last updated:** 2026-07-28  
**Related:** [organization-context-technical-debt.md](./organization-context-technical-debt.md), [storage-validation.md](./storage-validation.md), [ADR-008](../product/contract-center/adr-008-document-storage.md)

This file tracks **cross-cutting** platform debt. Organization-context-specific items remain in `organization-context-technical-debt.md`.

---

## Storage / Document Platform

### Completed in Milestone 2.1 / 2.1B (closed)

| Item | Resolution |
|------|------------|
| No shared immutable document asset model | Delivered: `document_assets` |
| Business FKs on file rows (anti-pattern for legal docs) | Avoided per ADR-008; relations external |
| Provider-independent storage for documents | `StorageProvider` + `CloudflareR2Provider` |
| Contract document metadata API without PDF/OCR | `POST/GET/DELETE /api/contracts/:id/documents` |
| SHA-256 integrity metadata | `checksum` + unit tests |
| Soft delete without immediate blob removal | `deletedAt` only |
| **Contract-specific DocumentService surface** | **2.1B:** generic `DocumentService` in `lib/documents`; Contract linking in `lib/contract-center` |

### Open — storage (from 2.1A / 2.1B)

| Item | Severity | Why deferred | Follow-up |
|------|----------|--------------|-----------|
| **Document + relation not in single DB transaction** | High | Blob-then-DB retained; orphan strategy documented | Optional `$transaction` for link step; platform create stays single-row |
| **Orphan blobs if DB fails after R2 put** | High | Recovery strategy documented; sweeper not built | Reconciliation job (later milestone) — see document-platform.md §10 |
| **Legacy `contract_documents` dual path** | Medium | Completeness engine / old upload still use legacy | Migrate consumers; then deprecate legacy table (see legacy-contract-migration) |
| **No magic-byte / content sniffing** | Medium | M2.1 used extension + declared MIME | Hardening for production legal intake |
| **Full-buffer upload (no streaming/multipart)** | Medium | 50 MB cap sufficient for v1 PDFs | Multipart/streaming when large assets share Document platform |
| **R2 timeouts/retries not customized** | Low | SDK defaults OK for foundation | Ops tuning + observability |
| **No retention hard-delete policy** | Low | Soft delete only by design | Policy engine post multi-module adoption |
| **Checksum index unused for dedup** | Low | Dedup explicitly future | Optional content-addressed reuse ADR |
| **List org filter partly in-memory** | Low | Small N | Push `organizationId` into relation query |
| **Coexistence with `Attachment` model** | Medium | Attachments still use entityType/entityId | Long-term: converge or document dual systems |
| **Signed download not productized** | Low | Explicitly M2.2 | Shared signed-url API for all modules |

### Not storage debt (do not regress)

- PDF viewer — Milestone 2.3  
- OCR / AI — Milestone 3  
- Virus scanning — future platform security milestone  

---

## Cross-links (existing high-priority platform debt)

| Item | Tracker |
|------|---------|
| `audit_logs` int org + `parseInt` on UUID | [audit-system-uuid-migration.md](../platform/work-items/audit-system-uuid-migration.md) |
| Legacy contract schema decommission | [legacy-contract-migration.md](../platform/legacy-contract-migration.md) |
| INT-scoped tables / org context | [organization-context-technical-debt.md](./organization-context-technical-debt.md) |

---

## Rules

1. Do not reopen closed 2.1 items without a new ADR.
2. Prefer additive relation tables over mutating `document_assets`.
3. Provider SDKs stay behind `StorageProvider` implementations.
4. Soft delete remains default; hard blob delete only via retention policy.
