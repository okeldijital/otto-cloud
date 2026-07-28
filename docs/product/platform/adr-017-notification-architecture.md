# ADR-017 — Notification Architecture

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Milestone** | 4.2 — Platform Event & Notification Framework |

---

## Decision

The **Notification Framework is a subscriber** of the Platform Event Bus. It does **not** own domain events.

In 4.2:

- In-app notifications only (`PlatformNotification`)  
- User preferences (enable/disable/frequency/channels storage)  
- Reminder scheduling (`PlatformReminder`) without external delivery  
- History + delivery records for in_app channel  

**Out of scope:** email, SMS, push, Slack, Teams, webhooks, calendar.

---

## Reason

Separating event publication from notification delivery allows:

- Multiple future channels as additional subscribers  
- Preference filtering without changing producers  
- Royalties/Releases to emit the same events without knowing UI  

---

## Flow

```
Domain module → Platform Event → notifications.in_app subscriber
                                      ↓
                              Preference check
                                      ↓
                           PlatformNotification (unread)
```

Reminders:

```
Lifecycle dates / API → PlatformReminder (scheduled)
                              ↓ (processDue)
                         reminders.fired event / in-app notification
```

---

## Consequences

| Area | Implication |
|------|-------------|
| APIs | `/api/notifications`, preferences, reminders |
| Workspace | Legacy `workspace_notifications` remains (`?scope=workspace`) |
| Channels | `channels` JSON on preferences — storage only |

---

## Related

- ADR-016 Platform Event Framework  
- [notification-architecture.md](../../architecture/notification-architecture.md)  
