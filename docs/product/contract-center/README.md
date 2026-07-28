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
| [milestone-2.3-complete.md](./milestone-2.3-complete.md) | PDF viewing completion report |
| [adr-011-document-intelligence.md](./adr-011-document-intelligence.md) | Intelligence layer decision |
| [milestone-3.0-complete.md](./milestone-3.0-complete.md) | Intelligence foundation completion |
| [adr-012-human-verification.md](./adr-012-human-verification.md) | Human verification trust boundary |
| [milestone-3.1-complete.md](./milestone-3.1-complete.md) | Verification workspace completion |
| [adr-013-verified-contract-domain.md](./adr-013-verified-contract-domain.md) | Verified contract platform domain |
| [milestone-3.2-complete.md](./milestone-3.2-complete.md) | Verified domain completion |
| [adr-014-contract-relationships.md](./adr-014-contract-relationships.md) | Relationship layer decision |
| [milestone-4.0-complete.md](./milestone-4.0-complete.md) | Relationship discovery completion |
| [adr-015-contract-lifecycle.md](./adr-015-contract-lifecycle.md) | Lifecycle domain decision |
| [milestone-4.1-complete.md](./milestone-4.1-complete.md) | Lifecycle management completion |
| [contract-lifecycle-architecture.md](../../architecture/contract-lifecycle-architecture.md) | Lifecycle technical architecture |

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
