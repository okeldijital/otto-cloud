# ADR-016 — Platform Event Framework

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Milestone** | 4.2 — Platform Event & Notification Framework |

---

## Decision

OTTO modules communicate through a **central Platform Event Bus**:

1. **Registry** — every event name is registered with version, producer, payload schema, consumers, idempotency, retention  
2. **Store** — immutable event persistence (`platform_events`)  
3. **Dispatcher** — publish → persist → dispatch → retry → DLQ  
4. **Subscribers** — in-process handlers registered by consumer modules  
5. **Dead Letter + Replay** — no silent failures; admin replay with idempotency  

Modules **never** call each other's business logic directly for cross-module side effects.

---

## Reason

Contract Center already emitted module-local event tables (lifecycle, relationships, verified). Without a platform bus:

- Notifications, royalties, releases would poll or import service code  
- No shared retry, DLQ, correlation, or monitoring  
- Event names would diverge per module  

---

## Alternatives considered

### A. Only audit_logs as the bus

Rejected — audit is compliance-oriented, not a delivery surface; no subscribers, retry, or DLQ.

### B. External broker (Kafka/SQS) first

Deferred — in-process dispatcher is sufficient for current scale; store schema is broker-ready later.

### C. Module-owned fan-out only

Rejected — couples producers to consumers.

---

## Naming

Stable dotted strings:

`contracts.lifecycle.activated` · `releases.created` · `notifications.created`

Legacy PascalCase module events map via `LEGACY_EVENT_MAP`.

---

## Consequences

| Area | Implication |
|------|-------------|
| Contract Center | Dual-writes domain tables + platform bus |
| Notifications | First subscriber — not event owner |
| Future modules | Register events + optional subscribers |
| Ops | Metrics + DLQ + replay APIs |

---

## Related

- ADR-017 Notification Architecture  
- [platform-events.md](../../architecture/platform-events.md)  
- [event-registry.md](../../architecture/event-registry.md)  
