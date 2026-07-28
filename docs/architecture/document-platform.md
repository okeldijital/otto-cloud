# Document Platform — Architectural Reference

| Field | Value |
|-------|--------|
| **Status** | Baseline (Milestone 2.1B) |
| **Date** | 2026-07-28 |
| **ADRs** | [ADR-008](../product/contract-center/adr-008-document-storage.md) |
| **Related** | [storage-architecture.md](./storage-architecture.md), [storage-validation.md](./storage-validation.md) |

This is the **authoritative integration guide** for every OTTO module that stores files as immutable documents.

---

## 1. Platform boundaries

| Owns | Does **not** own |
|------|------------------|
| `document_assets` rows | Business relationships |
| Blob lifecycle via `StorageProvider` | Contract / Release / Artist rules |
| Checksums, technical metadata | OCR, AI, PDF viewing |
| Soft delete of documents | Hard retention (future job) |
| Platform events (`DocumentUploaded`, …) | Domain link events |

**Principle:** Shared capabilities belong to the platform. Business-specific behavior belongs to individual modules.

---

## 2. Ownership model

```
┌─────────────────────────────────────────────────────────┐
│  Platform — lib/documents                               │
│  DocumentService → StorageProvider → CloudflareR2       │
│  DocumentRepository → document_assets                   │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ upload / softDelete / metadata
          ┌───────────────┼───────────────┐
          │               │               │
┌─────────┴────┐  ┌───────┴──────┐  ┌─────┴──────────┐
│ Contract     │  │ Releases     │  │ Rights / …     │
│ Center       │  │ (future)     │  │ (future)       │
│ lib/contract │  │ relation tbl │  │ relation tbl   │
│ -center      │  │ + facade     │  │ + facade       │
└──────────────┘  └──────────────┘  └────────────────┘
```

| Layer | Package | Responsibility |
|-------|---------|----------------|
| Platform storage | `lib/documents` | Immutable assets, provider I/O, platform events |
| Module relationships | e.g. `lib/contract-center` | Entity ownership checks, link tables, domain events |
| HTTP | `app/api/...` | Auth, transport; thin call into module facade |

---

## 3. Service model

### Platform — `DocumentService`

| Method | Purpose |
|--------|---------|
| `uploadDocument(UploadDocumentRequest)` | Validate → checksum → store → DB → `DocumentUploaded` |
| `softDeleteDocument(...)` | Set `deletedAt` → `DocumentDeleted` (no blob delete) |
| `getActiveDocument` / `getSignedDownloadUrl` | Read helpers |
| `toMetadata` | Safe DTO (no storage keys) |

**No** contract IDs, release IDs, or module branching inside this service.

### Module facade — e.g. `ContractDocumentService`

| Method | Purpose |
|--------|---------|
| `uploadAndLink` | Verify contract → `documentService.uploadDocument` → create relation → `ContractDocumentLinked` |
| `listForContract` | List relations + documents for a contract |
| `softDeleteLinked` | Verify link → `documentService.softDeleteDocument` → `ContractDocumentUnlinked` |

---

## 4. Repository model

| Repository | Package | Scope |
|------------|---------|--------|
| `DocumentRepository` | `lib/documents` | `document_assets` only |
| `ContractDocumentRepository` | `lib/contract-center` | `contract_document_relations` only |

Future modules add their own `*DocumentRepository` for their relation tables. They **never** fork `DocumentRepository`.

---

## 5. DTO model

### Platform (`lib/documents/dto`)

- `UploadDocumentRequest` / `UploadDocumentResponse`
- `DocumentMetadata`
- `SoftDeleteDocumentRequest`
- `StorageObject` (internal)

### Contract Center (`lib/contract-center/dto`)

- `UploadAndLinkContractDocumentRequest` / `Response`
- `LinkContractDocumentRequest`
- `ContractDocumentLink` (relationship + embedded `DocumentMetadata`)

Business DTOs **wrap** platform DTOs; they do not re-declare file fields.

---

## 6. Event model

### Platform events

| Event | Audit action | Meaning |
|-------|--------------|---------|
| `DocumentUploaded` | `document.uploaded` | Asset created |
| `DocumentDeleted` | `document.deleted` | Soft deleted |
| `DocumentRestored` | `document.restored` | Reserved |

### Contract events

| Event | Audit action | Meaning |
|-------|--------------|---------|
| `ContractDocumentLinked` | `document.linked` | Relation created |
| `ContractDocumentUnlinked` | `document.unlinked` | Soft-delete path after link check |

Storage events **never** mention Contracts.

---

## 7. Extension model (future consumers)

To integrate a new module (e.g. Releases):

1. **Do not** modify `document_assets` or `DocumentService` upload core.
2. Add `release_document_relations` (or equivalent).
3. Add `lib/release-center` (or module package) with:
   - relation repository
   - facade service calling `documentService.uploadDocument` + link
   - domain events (`ReleaseDocumentLinked`, …)
4. Add HTTP routes under that module’s API namespace.
5. Pass module-specific MIME/size policy into `UploadDocumentRequest`.

### Simulated integrations

| Module | Ready without Document Platform changes? | Glue required |
|--------|------------------------------------------|---------------|
| Release Workspace | Yes | Relation table + facade + routes |
| Rights Management | Yes | Same |
| Royalty Engine | Yes | Statement entity + relation |
| Artist Management | Yes | Same |
| Organization Settings | Yes | UUID entity ids on relation table |

**Remaining coupling:** Contract Center still uses `legacyIntOrgId` for the legacy `contracts` table. That is a **Contract** concern, not a Document Platform concern.

---

## 8. Integration pattern (canonical)

```
Business Module HTTP route
        ↓
ModuleFacadeService (ownership + policy)
        ↓
documentService.uploadDocument({ …, allowedMimeTypes })
        ↓
StorageProvider.upload
        ↓
documentRepository.create
        ↓
Module relationRepository.create
        ↓
Platform events + domain events
```

---

## 9. Package layout

```
lib/
├── documents/                 # PLATFORM
│   ├── services/
│   ├── repositories/
│   ├── providers/
│   ├── dto/
│   ├── events/
│   ├── validation/
│   ├── types/
│   └── index.ts
│
└── contract-center/           # MODULE
    ├── services/
    ├── repositories/
    ├── dto/
    ├── events/
    ├── constants.ts
    └── index.ts
```

---

## 10. Orphan recovery (documented strategy)

Upload writes the blob **before** the DB row (and modules link after the DB row). Partial failure can leave:

1. Blob without `document_assets` row  
2. `document_assets` row without any relationship links  

**Do not redesign the happy path in 2.1B.** Recovery:

| Concern | Strategy |
|---------|----------|
| **Orphan detection** | (a) R2 inventory vs `document_assets.storageKey`; (b) documents with zero rows across all `*_document_relations` tables |
| **Cleanup process** | Soft-delete unlinked documents older than grace period; hard-delete blobs only via retention policy after soft-delete age |
| **Retry behavior** | Client retries upload → new UUID key → new document (immutability); safe to retry |
| **Reconciliation job** | Background milestone (post multi-module): scheduled job compares keys, emits metrics, optional quarantine |

Implementation of the sweeper is **explicitly deferred**.

---

## 11. Stability rules

1. Do not add business FKs to `document_assets`.
2. Do not call R2 from modules.
3. Do not rename platform events to module names.
4. Structural changes require a new ADR.
5. HTTP routes for Contracts remain stable; internals may refactor behind facades.

---

## 12. Code entry points

| Concern | Import |
|---------|--------|
| Platform storage | `@/lib/documents` |
| Contract linking | `@/lib/contract-center` |
| Contract HTTP | `app/api/contracts/[id]/documents` |
