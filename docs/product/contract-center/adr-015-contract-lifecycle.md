# ADR-015 — Contract Lifecycle Domain

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Milestone** | 4.1 — Contract Lifecycle Management |

---

## Decision

Verified contracts gain a **first-class lifecycle domain** that is:

- **Deterministic** — state transitions are validated against an explicit graph
- **Auditable** — timeline entries and domain events are append-only
- **Event-driven** — platform consumers subscribe to lifecycle events, not poll records
- **Non-AI** — no extraction, scoring, or automated renewal decisions

Primary aggregates:

| Model | Role |
|-------|------|
| `ContractLifecycle` | Status, renewal flags, supersession pointers |
| `ContractKeyDate` | Effective, expiration, notice, etc. (source + verification state + timezone) |
| `ContractRenewal` | Renewal history (manual only; no auto-execution) |
| `ContractAmendment` | Separate amendment registration records |
| `ContractTimelineEntry` | Unified operational timeline |
| `ContractLifecycleEvent` | Platform event log for future consumers |

---

## Reason

After M3.2 (verified domain) and M4.0 (relationships), contracts are trusted data but still static. Operations need:

- Where is this contract in its commercial life?
- When does it expire / require notice?
- What amendments and supersessions apply?
- A single timeline for audit and UI

Lifecycle is the **operational backbone** of Contract Center. Future Notification, Calendar, Release Workspace, Royalty, and Analytics services must consume **lifecycle events** rather than invent their own state machines.

---

## Alternatives considered

### A. Extend legacy `contracts` status column only

Rejected — mixes operational lifecycle with CRM/legacy fields; no key dates, renewals, amendments, or events.

### B. Store lifecycle as JSON on VerifiedContract

Rejected — poor queryability for dashboard widgets (expiring soon, pending renewal); weak audit.

### C. Automatic renewal job that flips status

Rejected for 4.1 — milestone explicitly forbids automatic renewals. Model supports `autoRenew` flags and history; execution is out of scope.

---

## State machine

```
draft → pending_verification → verified → active ⇄ pending_renewal
                                    ↓         ↓
                               terminated  expired
                                    ↓         ↓
                                 archived ←───┘
                  (also: verified|active → superseded → archived)
```

`canTransition(from, to)` enforces the graph. Invalid transitions return `INVALID_TRANSITION`.

---

## Events (stable integration surface)

| Event | When |
|-------|------|
| `ContractActivated` | Status → active |
| `ContractExpired` | Status → expired |
| `ContractRenewalDue` | Status → pending_renewal |
| `ContractRenewed` | Manual mark renewed |
| `ContractSuperseded` | Supersession recorded |
| `ContractAmended` | Amendment registered |
| `LifecycleStatusChanged` | Any status change |

Persisted in `contract_lifecycle_events`. Future: Notification Service, Calendar, Release Workspace, Royalty Engine, Reporting, Analytics.

---

## Permissions

| Role | Capability |
|------|------------|
| Viewer / read-only | Read lifecycle, timeline, amendments |
| Member / admin / super-admin | Change status, dates, renewals, amendments, supersession |

---

## Consequences

| Area | Implication |
|------|-------------|
| Verified domain | Seeds initial status + key dates when lifecycle is first created |
| Relationships | Unchanged; timeline may later record relationship events |
| Notifications | Documented consumers only — not implemented in 4.1 |
| AI | Explicitly excluded |

---

## Related

- ADR-013 Verified Contract Domain  
- ADR-014 Contract Relationships  
- [contract-lifecycle-architecture.md](../../architecture/contract-lifecycle-architecture.md)  
- [milestone-4.1-complete.md](./milestone-4.1-complete.md)  
