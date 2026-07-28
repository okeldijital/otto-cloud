# Notification Architecture

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **Package** | `lib/platform/notifications` |
| **ADR** | [ADR-017](../product/platform/adr-017-notification-architecture.md) |

---

## Principle

Notifications are **subscribers**, not owners of platform events.

---

## Entities

| Table | Role |
|-------|------|
| `platform_notifications` | In-app inbox (unread/read/archived/dismissed) |
| `platform_notification_preferences` | Per-user type enable/frequency/channels |
| `platform_notification_deliveries` | Channel attempts (`in_app` only in 4.2) |
| `platform_notification_history` | Action audit trail |
| `platform_reminders` | Scheduled reminders |
| `platform_reminder_schedules` | Offset rules |

---

## Subscriber

`notifications.in_app` listens to:

- `contracts.lifecycle.*`
- `contracts.relationship.*`
- `contracts.verification.*`
- `contracts.verified.*`
- `reminders.fired`

Maps events → data-driven notification types → fans out to org members (respecting preferences).

---

## Preferences

Storage only for future channels:

```json
{ "in_app": true, "email": false }
```

Frequency: `immediate` | `digest` | `disabled`.

---

## Reminders

Schedule from lifecycle dates (expiration −30d, notice −7d, etc.) or `POST /api/reminders`.

`processDue()` fires scheduled rows into in-app notifications. **No email.**

---

## APIs

| Method | Path |
|--------|------|
| GET | `/api/notifications` |
| PATCH | `/api/notifications/:id` |
| GET/PATCH | `/api/notification-preferences` |
| GET/POST | `/api/reminders` |
| PATCH | `/api/reminders/:id` |

Legacy workspace inbox: `GET /api/notifications?scope=workspace`.

---

## Out of scope

Email · SMS · push · Slack · Teams · calendar · webhooks.
