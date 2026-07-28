# Event Registry

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **Source** | `lib/platform/events/registry/definitions.ts` |

---

## Rules

1. Every published event **must** be registered.  
2. Names are **stable dotted strings**, not enums.  
3. Version is semantic-ish (`1.0`).  
4. Consumers are declared for documentation; runtime uses subscriber registry.  
5. Legacy PascalCase names map through `LEGACY_EVENT_MAP`.  

---

## Definition shape

```ts
{
  name: "contracts.lifecycle.activated",
  version: "1.0",
  producer: "contract-center",
  description: "...",
  payloadSchema: { contractId: "number" },
  consumers: ["notifications", "reminders"],
  idempotencyStrategy: "event_subscriber",
  retentionPolicy: "indefinite",
}
```

---

## Contract Center events (initial)

| Name | Producer |
|------|----------|
| `contracts.document.uploaded` | contract-center |
| `contracts.document.deleted` | contract-center |
| `contracts.verification.completed` | contract-center |
| `contracts.verification.reopened` | contract-center |
| `contracts.extraction.completed` | contract-center |
| `contracts.verified.created` | contract-center |
| `contracts.verified.updated` | contract-center |
| `contracts.verified.reverified` | contract-center |
| `contracts.relationship.created` | contract-center |
| `contracts.relationship.removed` | contract-center |
| `contracts.relationship.suggested` | contract-center |
| `contracts.relationship.rejected` | contract-center |
| `contracts.lifecycle.status_changed` | contract-center |
| `contracts.lifecycle.activated` | contract-center |
| `contracts.lifecycle.expired` | contract-center |
| `contracts.lifecycle.renewal_due` | contract-center |
| `contracts.lifecycle.renewed` | contract-center |
| `contracts.lifecycle.superseded` | contract-center |
| `contracts.lifecycle.amended` | contract-center |

## Platform / notifications

| Name | Producer |
|------|----------|
| `platform.events.replayed` | platform |
| `notifications.created` | notifications |
| `reminders.created` | notifications |
| `reminders.fired` | notifications |

## Future (not yet registered as required)

`releases.created` · `rights.assigned` · `royalties.calculated` · `notifications.sent`

Register before first publish.

---

## API

`GET /api/platform/events?view=registry`
