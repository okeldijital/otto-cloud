# Contract Center

Product documentation for OTTO’s legal agreement surface: contracts, documents, and (later) document intelligence.

## Documents

| Document | Purpose |
|----------|---------|
| [ROADMAP.md](./ROADMAP.md) | Milestones and phased Document Repository plan |
| [CHANGELOG.md](./CHANGELOG.md) | Baseline and subsequent product/doc decisions |
| [implementation-roadmap.md](./implementation-roadmap.md) | Implementation tracking |
| [adr-008-document-storage.md](./adr-008-document-storage.md) | Immutable platform document decision |
| [milestone-2.1-complete.md](./milestone-2.1-complete.md) | Storage Foundation completion report |
| [milestone-2.1-review.md](./milestone-2.1-review.md) | 2.1A architecture validation & baseline decision |
| [document-platform.md](../../architecture/document-platform.md) | Platform integration reference (post-2.1B) |
| [milestone-2.2-complete.md](./milestone-2.2-complete.md) | Repository UI completion report |

## Platform dependencies (do not implement here)

| Document | Why it lives under platform |
|----------|------------------------------|
| [Audit System UUID Migration](../../platform/work-items/audit-system-uuid-migration.md) | Shared audit infrastructure |
| [Legacy contract decommission](../../platform/legacy-contract-migration.md) | Cross-module exit from legacy schema |

## Related engineering docs

- `docs/contracts_system.md` — operational notes for current contracts module
- `CONTRACT_SYSTEM_V1.md` — historical V1 principles
- `docs/architecture/01-data-model.md` — contracts entity catalog
- `docs/architecture/multi-tenant-model.md` — org isolation (incl. INT-scoped legacy contracts)
)
