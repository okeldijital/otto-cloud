# Platform documentation

Cross-cutting infrastructure concerns that must **not** be solved inside a single product module (e.g. Contract Center).

## Work items

| Task | Status | Priority | Target |
|------|--------|----------|--------|
| [Audit System UUID Migration](./work-items/audit-system-uuid-migration.md) | Scheduled | High | Before Production |

## Milestone 4.2 — Platform Event & Notification Framework ✅

| Document | Purpose |
|----------|---------|
| [ADR-016 Platform Event Framework](../product/platform/adr-016-platform-event-framework.md) | Decision |
| [ADR-017 Notification Architecture](../product/platform/adr-017-notification-architecture.md) | Decision |
| [milestone-4.2-complete.md](../product/platform/milestone-4.2-complete.md) | Completion report |
| [platform-events.md](../architecture/platform-events.md) | Bus architecture |
| [event-registry.md](../architecture/event-registry.md) | Registered events |
| [notification-architecture.md](../architecture/notification-architecture.md) | Notification consumer |
| [event-replay.md](../architecture/event-replay.md) | Replay / DLQ |

**Package:** `lib/platform/events`, `lib/platform/notifications`  
**Tests:** `npm run test:platform-events` · `npm run test:notifications`

## Migration & decommission

| Document | Purpose |
|----------|---------|
| [Legacy Contract Schema Decommission Plan](./legacy-contract-migration.md) | Ordered exit path from legacy `contracts*` tables to Contract Center |

## Related architecture

- [ADR-001 — Isolation boundary](../architecture/decisions/ADR-001-isolation-boundary.md)
- [Multi-tenant model](../architecture/multi-tenant-model.md)
- [Organization context technical debt](../architecture/organization-context-technical-debt.md)
)
