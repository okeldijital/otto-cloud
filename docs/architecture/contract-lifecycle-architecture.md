# Contract Lifecycle Architecture

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **Package** | `lib/contract-lifecycle` |
| **ADR** | [adr-015-contract-lifecycle.md](../product/contract-center/adr-015-contract-lifecycle.md) |

---

## Guiding flow

```
Verified Contract
      ↓
Lifecycle (status + key dates + renewal model)
      ↓
Operational Events (timeline + domain events)
      ↓
Platform Notifications (future)
      ↓
Business Workflows (future)
```

Contracts become active operational records rather than static documents.

---

## Domain models

| Table | Purpose |
|-------|---------|
| `contract_lifecycles` | One row per contract; status engine + renewal + supersession |
| `contract_key_dates` | Typed dates with source, verificationState, timezone |
| `contract_renewals` | Renewal history entries (manual completion) |
| `contract_amendments` | Amendment registration (separate records) |
| `contract_timeline_entries` | Append-only operational timeline |
| `contract_lifecycle_events` | Platform event log |

---

## Status engine

Constants: `LIFECYCLE_STATUS`, `LIFECYCLE_TRANSITIONS`, `canTransition()`.

| Status | Typical meaning |
|--------|-----------------|
| `draft` | No verified operational record yet |
| `pending_verification` | Docs uploaded; human verification in progress |
| `verified` | Verified domain exists; not yet commercially active |
| `active` | In force |
| `pending_renewal` | Renewal window / notice period |
| `expired` | Past expiration without renewal |
| `terminated` | Explicit early termination |
| `superseded` | Replaced by another verified contract |
| `archived` | Terminal storage state |

No AI. No automatic status flips on cron.

---

## Key dates

Types: `effective` · `execution` · `expiration` · `renewal` · `notice_deadline` · `termination` · `review`

Each date stores:

- `dateValue` (date)
- `timezone` (default UTC)
- `source` (verified_contract | manual | …)
- `verificationState` (verified | manual | …)

Seeded from Verified Contract when lifecycle is first created (best-effort parse of text dates).

---

## Renewal model

On `ContractLifecycle`:

- `autoRenew` (boolean flag only — **no automatic execution**)
- `renewalIntervalMonths`
- `noticePeriodDays`
- `renewalStatus` (`none` | `pending` | `due` | `completed` | `waived`)

History rows: `ContractRenewal`. Manual path: `markRenewed` on PATCH lifecycle.

---

## Amendments

`POST /api/contracts/:id/amendments` registers:

- amendment number (unique per contract)
- effective date
- reason
- optional linked verified version
- status (`registered` default)

No document comparison.

---

## Supersession

PATCH lifecycle with `supersedesContractId` (+ optional reason/date):

1. Updates current lifecycle supersedes pointers  
2. If target allows transition → sets target status `superseded` and `supersededByContractId`  
3. Timeline + `ContractSuperseded` events on both sides  

No deletion. History preserved.

---

## Timeline

Append-only `ContractTimelineEntry`. Entry types include:

`lifecycle` · `status_change` · `renewal` · `amendment` · `supersession` · (future: verification_completed, relationship_created, reminders)

GET `/api/contracts/:id/timeline`.

---

## Service

`ContractLifecycleService` (`lib/contract-lifecycle/lifecycle-service.ts`):

| Method | Role |
|--------|------|
| `getOrCreate` | Lazy lifecycle + seed from verified |
| `update` | Status, dates, renewal, supersession, markRenewed |
| `createAmendment` | Amendment registration |
| `getTimeline` | Ordered timeline |
| `getDashboardSummary` | Widget aggregates |

Permissions: `canManageLifecycle` / `assertCanManageLifecycle`.

---

## APIs

| Method | Path |
|--------|------|
| GET | `/api/contracts/:id/lifecycle` |
| PATCH | `/api/contracts/:id/lifecycle` |
| GET, POST | `/api/contracts/:id/amendments` |
| GET | `/api/contracts/:id/timeline` |
| GET | `/api/contracts/lifecycle-summary` |

Read/write only. No email, calendar, or workflow automation.

---

## Events

Published via `publishLifecycleEvent` → `contract_lifecycle_events` (+ audit when userId present):

- `ContractActivated`
- `ContractExpired`
- `ContractRenewalDue`
- `ContractRenewed`
- `ContractSuperseded`
- `ContractAmended`
- `LifecycleStatusChanged`

---

## UI

Contract Detail tabs:

- **Lifecycle** — status, key dates, renewal, supersession
- **Timeline** — operational history
- **Amendments** — register / list

Dashboard: `LifecycleDashboardWidgets` (expiring soon, pending renewal, recently verified/amended, expired).

---

## Future consumers (document only — not implemented)

| Consumer | Interest |
|----------|----------|
| Notification Service | Renewal due, expiration, status changes |
| Calendar Integration | Key dates → calendar entries |
| Release Workspace | Active / superseded contract gates |
| Royalty Engine | Effective term windows |
| Reporting / Analytics | Portfolio status distributions |

These services **must subscribe to lifecycle events** rather than polling contract rows.

---

## Out of scope (4.1)

AI reminders · email · calendar sync · workflow automation · approval routing · negotiation · e-sign · royalty/release automation · clause intelligence.
