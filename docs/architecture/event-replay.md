# Event Replay

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **API** | `POST /api/platform/events/replay` |

---

## Purpose

Recover from subscriber failures and re-process events without mutating original payloads.

---

## Modes

| Body field | Behavior |
|------------|----------|
| `eventId` | Re-dispatch one event |
| `deadLetterId` | Mark DLQ replayed + re-dispatch underlying event |
| `correlationId` | All events in correlation (max 100) |
| `from` / `to` | Date range on `publishedAt` |

---

## Idempotency

Deliveries use unique key `eventId:subscriberId`.

Replay:

1. Resets `failed` / `dead_letter` deliveries to `pending`  
2. Forces re-invoke of matching subscribers  
3. Successful prior `delivered` rows are skipped unless force path re-runs handler  
4. Emits `platform.events.replayed` (store-only audit event)  
5. Audits `platform.event.replay`  

---

## Authorization

Organization **admin** (or super-admin) only — `assertCanReplay`.

---

## Guarantees

- Original event **payload never changes**  
- Processing history is **append-only**  
- No silent swallow of permanent failures  
