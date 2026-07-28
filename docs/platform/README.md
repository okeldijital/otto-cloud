# Platform documentation

Cross-cutting infrastructure concerns that must **not** be solved inside a single product module (e.g. Contract Center).

## Work items

| Task | Status | Priority | Target |
|------|--------|----------|--------|
| [Audit System UUID Migration](./work-items/audit-system-uuid-migration.md) | Scheduled | High | Before Production |

## Migration & decommission

| Document | Purpose |
|----------|---------|
| [Legacy Contract Schema Decommission Plan](./legacy-contract-migration.md) | Ordered exit path from legacy `contracts*` tables to Contract Center |

## Related architecture

- [ADR-001 — Isolation boundary](../architecture/decisions/ADR-001-isolation-boundary.md)
- [Multi-tenant model](../architecture/multi-tenant-model.md)
- [Organization context technical debt](../architecture/organization-context-technical-debt.md)
)
