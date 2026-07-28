# ADR-008 — Document Storage Architecture

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Milestone** | Contract Center 2.1 — Storage Foundation |

---

## Decision

**Documents are immutable platform assets.**

Business entities **reference** documents through relationship tables.

Documents **never** reference business entities.

---

## Reason

- Supports **Contracts** today (via `ContractDocumentRelation`).
- Supports **Releases** tomorrow (via a future `ReleaseDocument` relation).
- Supports **Rights** later and every future document type.
- Keeps storage, checksums, and soft-delete policy in one reusable subsystem.
- Prevents module-specific file columns that cannot be shared across OTTO.

---

## Alternatives considered

### A. Files owned by Contracts (`contract_documents` with `contract_id`)

Rejected for new work. Couples storage to one module; Releases/Rights would re-implement the same stack.

### B. Attachments with embedded `entityType` / `entityId` on the document row

Rejected as the long-term model for legal documents. The document row would still point at business entities, reversing the dependency and complicating multi-link reuse (one PDF used by Contract + Release).

### C. Provider-specific storage inside the Contracts module

Rejected. Business logic must not call Cloudflare R2 (or any provider) directly.

---

## Consequences

| Area | Implication |
|------|-------------|
| Schema | `document_assets` holds technical metadata only (no `contractId`, `releaseId`, AI fields). |
| Relations | `contract_document_relations` (and future tables) link entities → documents. |
| Immutability | Replace = new document row + new relation; never mutate bytes or overwrite metadata in place. |
| Soft delete | `deletedAt` on the document; blob hard-delete deferred to retention policy. |
| Storage | `DocumentService` → `StorageProvider` → `CloudflareR2Provider` (or future providers). |
| Scope | Contract Center consumes platform documents; does not own storage architecture. |

---

## Future implications

- Additional relation tables: `release_document_relations`, `artist_document_relations`, etc.
- Retention jobs may hard-delete storage objects after policy windows.
- Optional deduplication by checksum (future; not Milestone 2.1).
- Milestone 2.2 UI and 2.3 PDF viewing build on this foundation without changing ownership model.
- Milestone 3 intelligence (OCR/AI) consumes document bytes via the same service; never stores content inspection results on the Document row unless a separate analysis entity is introduced later.

---

## References

- Milestone 2.1 specification (Storage Foundation)
- `docs/product/contract-center/ROADMAP.md`
- `lib/documents/*`
- `prisma/schema.prisma` → `DocumentAsset`, `ContractDocumentRelation`
)
