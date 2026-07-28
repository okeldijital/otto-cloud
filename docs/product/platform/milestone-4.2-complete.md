# Milestone 4.2 Complete — Platform Event & Notification Framework

| Field | Value |
|-------|--------|
| Version | 1.0 |
| Status | Implemented |
| Date | 2026-07-28 |
| ADRs | [ADR-016](./adr-016-platform-event-framework.md), [ADR-017](./adr-017-notification-architecture.md) |

---

## Delivered

### Platform Event Bus

- Event registry (versioned, named, documented)  
- Immutable event store  
- Dispatcher (publish / dispatch / retry / replay)  
- Subscriber framework (pattern match)  
- Dead letter queue  
- In-process metrics + org aggregates  
- Correlation / causation IDs  

### Notification Framework

- In-app notifications (unread / read / archive / dismiss)  
- Preferences (enable, frequency, channel storage)  
- Reminder scheduling + due processing  
- Notification subscriber on platform events  

### Contract Center integration

First producer: lifecycle, relationships, verified, verification, document link events dual-write to the platform bus via `publishPlatformEvent`.

### APIs

| Area | Paths |
|------|--------|
| Events | `GET /api/platform/events`, `GET .../:id`, `POST .../replay` |
| Notifications | `GET /api/notifications`, `PATCH .../:id` |
| Preferences | `GET/PATCH /api/notification-preferences` |
| Reminders | `GET/POST /api/reminders`, `PATCH .../:id` |

### UI

Dashboard: platform events monitoring widgets (recent, DLQ, queues).

---

## Tests

```bash
npm run test:platform-events
npm run test:notifications
```

---

## Ops

```bash
npx prisma migrate deploy
```

Migration: `20260728190000_platform_events_notifications`

---

## Explicitly not implemented

Email · SMS · push · Slack · Teams · calendar · webhooks · workflow / royalty / release automation · AI agents.

---

## Success criteria

| Criterion | Status |
|-----------|--------|
| Event bus + registry + store | ✓ |
| Dispatcher + subscribers + retry + DLQ + replay | ✓ |
| Notifications + preferences + reminders (in-app) | ✓ |
| Monitoring metrics + dashboard | ✓ |
| Contract Center publishes via platform | ✓ |
| No external channel delivery | ✓ |
| Tests pass | ✓ |
