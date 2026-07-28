# Session Management (A.3)

| Field | Value |
|-------|--------|
| Package | `lib/platform/identity/authentication/sessions/` |
| ADR | [ADR-030](../product/platform/adr-030-session-lifecycle.md) |

## Services

| Service | Role |
|---------|------|
| `SessionService` | Create, refresh, revoke, logout-all, list/detail |
| `SessionPolicyService` | Policy facade |
| `SessionAuditService` | Audit + activity |
| `SessionCleanupService` | Expire / archive / purge |
| `DeviceService` | UA parse + device registry |
| `TrustedDeviceService` | Trust foundation (A.4 activates) |
| `SessionRepository` | Data access |

## APIs

| Method | Path |
|--------|------|
| GET | `/api/auth/sessions` |
| GET | `/api/auth/sessions/:id` |
| DELETE | `/api/auth/sessions/:id` |
| POST | `/api/auth/logout-all` |
| POST | `/api/auth/sessions/cleanup` |
| GET/DELETE | `/api/admin/security/sessions` |

## UI

- `/settings/security/sessions`
- `/admin/security/sessions`
