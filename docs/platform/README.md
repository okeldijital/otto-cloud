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
| [milestone-4.2a-complete.md](../product/platform/milestone-4.2a-complete.md) | Event contracts & schema validation |
| [platform-events.md](../architecture/platform-events.md) | Bus architecture |
| [event-registry.md](../architecture/event-registry.md) | Registered events |
| [event-contracts.md](../architecture/event-contracts.md) | Payload contracts / validation |
| [notification-architecture.md](../architecture/notification-architecture.md) | Notification consumer |
| [event-replay.md](../architecture/event-replay.md) | Replay / DLQ |

**Package:** `lib/platform/events`, `lib/platform/notifications`  
**Tests:** `npm run test:platform-events` · `npm run test:event-contracts` · `npm run test:notifications`

## Milestone 5.0 — Release Workspace Contract Integration ✅

First business module consuming Verified Contract, Relationships, Lifecycle, Events.

| Document | Purpose |
|----------|---------|
| [ADR-018](../product/release-workspace/adr-018-release-contract-integration.md) | Ownership boundaries |
| [milestone-5.0-complete.md](../product/release-workspace/milestone-5.0-complete.md) | Completion |
| [release-contract-integration.md](../architecture/release-contract-integration.md) | Integration architecture |
| [release-read-model.md](../architecture/release-read-model.md) | Projection model |

**Package:** `lib/release-workspace/contracts`  
**Tests:** `npm run test:release-contracts`

## Platform Projection Framework ✅

Reusable projection engine extracted so modules do not own bus wiring.

| Document | Purpose |
|----------|---------|
| [ADR-019](../product/platform/adr-019-platform-projections.md) | Decision |
| [platform-projections.md](../architecture/platform-projections.md) | Architecture |

**Package:** `lib/platform/projections`  
**API:** `GET/POST /api/platform/projections`  
**Tests:** `npm run test:projections`

## Milestone 6.0 — Rights Management Foundation ✅

| Document | Purpose |
|----------|---------|
| [ADR-020 Rights Domain](../product/rights/adr-020-rights-domain.md) | Decision |
| [milestone-6.0-complete.md](../product/rights/milestone-6.0-complete.md) | Completion |
| [rights-domain-architecture.md](../architecture/rights-domain-architecture.md) | Architecture |

**Package:** `lib/rights`  
**Tests:** `npm run test:rights`

## Milestone 7.0 — Royalty Entitlement Foundation ✅

| Document | Purpose |
|----------|---------|
| [ADR-021](../product/royalties/adr-021-royalty-entitlement-domain.md) | Decision |
| [milestone-7.0-complete.md](../product/royalties/milestone-7.0-complete.md) | Completion |

**Package:** `lib/royalties`  
**Tests:** `npm run test:royalty-entitlements`

## Platform Milestone A — Identity & Access Management

| Phase | Status | Notes |
|-------|--------|--------|
| **A.0 Foundation** | ✅ Complete | Schema, crypto, catalog, ADRs |
| A.1 Authentication | Planned | Replace next-auth login |
| A.2–A.10 | Planned | Password, sessions, MFA, RBAC, invitations, security center |

| Document | Purpose |
|----------|---------|
| [ADR-022 IAM](../product/platform/adr-022-identity-access-management.md) | Decision: new platform, no retrofit |
| [milestone-iam-a0-complete.md](../product/platform/milestone-iam-a0-complete.md) | A.0 completion |
| [identity-architecture.md](../architecture/identity-architecture.md) | Package layout |
| [legacy-archive](./identity/legacy-archive/README.md) | Frozen next-auth surface |

**Package:** `lib/platform/identity`  
**Tests:** `npm run test:identity`  
**Policy:** Do not migrate `lib/auth.ts` in place.

## Migration & decommission

| Document | Purpose |
|----------|---------|
| [Legacy Contract Schema Decommission Plan](./legacy-contract-migration.md) | Ordered exit path from legacy `contracts*` tables to Contract Center |

## Related architecture

- [ADR-001 — Isolation boundary](../architecture/decisions/ADR-001-isolation-boundary.md)
- [Multi-tenant model](../architecture/multi-tenant-model.md)
- [Organization context technical debt](../architecture/organization-context-technical-debt.md)
)
