# Platform Event Architecture

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **Package** | `lib/platform/events` |
| **ADR** | [ADR-016](../product/platform/adr-016-platform-event-framework.md) |

---

## Flow

```
Business Module
      ↓
Domain Events (optional module-local log)
      ↓
Platform Event Bus (publish)
      ↓
Schema validation (payload contract)
      ↓
Event Store (immutable)
      ↓
Dispatcher → Subscribers
      ↓
Future channels
```

Producers never know which subscribers exist. Invalid payloads never enter the store.

---

## Components

| Path | Role |
|------|------|
| `registry/` | Event definitions + contracts |
| `contracts/` | Payload schema validation (M4.2A) |
| `store/` | Persist / list / history append |
| `dispatcher/` | Validate, publish, dispatch, retry, replay |
| `subscribers/` | In-process registration + pattern match |
| `retry/` | Exponential backoff policy |
| `dead-letter/` | Permanent failures |
| `metrics/` | In-process + org aggregates |

See [event-contracts.md](./event-contracts.md) for formal payload contracts.

---

## Event store fields

`id` · `eventName` · `version` · `producer` · `organizationId` · `payload` · `metadata` · `occurredAt` · `publishedAt` · `status` · `retryCount` · `correlationId` · `causationId` · `parentEventId` · `processingHistory` · entity refs

**Payload is never mutated.**

---

## APIs

| Method | Path |
|--------|------|
| GET | `/api/platform/events` |
| GET | `/api/platform/events/:id` |
| POST | `/api/platform/events/replay` |

Query `view=registry|dead_letter|metrics`.

---

## Retry & DLQ

- Immediate first retry option  
- Exponential backoff + jitter  
- Max retries → `platform_dead_letters`  
- Replay resets failed deliveries with idempotency keys `eventId:subscriberId`  

---

## First producer

Contract Center dual-writes:

- Lifecycle, relationships, verified, verification, document link events  

via `publishPlatformEvent` / legacy name map.

---

## Out of scope

Email · SMS · push · Slack · webhooks · workflow automation · AI agents.
