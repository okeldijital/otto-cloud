# Storage Architecture

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **Milestones** | 2.1 Storage Foundation · 2.1A Validation · 2.1B Platform Extraction |
| **Deep reference** | [document-platform.md](./document-platform.md) |

---

## Platform ownership

The **Document Platform** (`lib/documents`) owns:

- Immutable document records (`document_assets`)
- Object storage access via `StorageProvider`
- Cloudflare R2 provider implementation
- Technical metadata (filename, MIME, size, checksum, keys)
- Soft-delete markers on documents
- Platform lifecycle events

Configuration is centralized in `lib/config/storage` (R2 env vars). The S3-compatible client is lazy-initialized in `lib/storage/client`.

---

## Module ownership

Business modules own:

- Entity existence and authorization (e.g. “does this contract belong to this org?”)
- Relationship tables (e.g. `contract_document_relations`)
- Domain MIME/size policies
- Domain events (`ContractDocumentLinked`, …)
- Module HTTP APIs

**Contract Center** package: `lib/contract-center`.

Modules **must not**:

- Import `@aws-sdk/*` for document storage
- Write `storageKey` onto business tables as a substitute for documents
- Put `contractId` / `releaseId` on `document_assets`

---

## Relationship ownership

```
Business entity  →  *DocumentRelation  →  DocumentAsset
```

| Owner | Artifact |
|-------|----------|
| Platform | `DocumentAsset` |
| Contract Center | `ContractDocumentRelation` |
| Future Releases | `ReleaseDocumentRelation` (example) |

Documents never reference business entities (ADR-008).

---

## Extension strategy

1. Keep `DocumentService.uploadDocument` generic.
2. Add relation table + module facade.
3. Pass allow-lists into upload request.
4. Emit domain events after linking.

No Document Platform schema change is required for new modules.

---

## Future consumers

| Consumer | Integration |
|----------|-------------|
| Release Workspace | Relation + facade |
| Rights Management | Relation + facade |
| Royalty Engine | After statement entity |
| Artist Management | Relation + facade |
| Organization Settings | Relation using UUID org/entity ids |

See [document-platform.md §7](./document-platform.md).

---

## Stack

```
Business Module
      ↓
DocumentService          (lib/documents)
      ↓
StorageProvider          (interface)
      ↓
CloudflareR2Provider     (lib/documents/providers)
      ↓
storageClient + storageConfig
```

Legacy attachment upload (`lib/storage` + `Attachment` model) remains a parallel path for entityType/entityId attachments. Long-term convergence is tracked as technical debt; new **legal/document** flows use the Document Platform.

---

## Orphan recovery

Blob-before-DB can leave orphans. Strategy (detection, cleanup, retry, reconciliation job) is documented in [document-platform.md §10](./document-platform.md). Sweeper implementation is deferred.

---

## Related docs

- [document-platform.md](./document-platform.md) — integration reference  
- [storage-validation.md](./storage-validation.md) — 2.1A review  
- [technical-debt.md](./technical-debt.md)  
- [ADR-008](../product/contract-center/adr-008-document-storage.md)  
