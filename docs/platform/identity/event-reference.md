# Identity Event Reference (v1.0)

Publisher: `identity` via Platform Event Bus (`publishPlatformEvent`).

| Event | Payload (common) | Typical consumers |
|-------|------------------|-------------------|
| `identity.login.success` | identityId, sessionId | security, notifications |
| `identity.login.failed` | email, reason | security |
| `identity.logout` | sessionId | security |
| `identity.password.*` | identityId | notifications, security |
| `identity.session.*` | sessionId, reason | security |
| `identity.mfa.*` | identityId, method | security, notifications |
| `identity.invitation.*` | invitationId, email | notifications |
| `identity.organization.*` | organizationId | audit |
| `identity.membership.*` | membershipId | audit |
| `identity.role.assigned/removed` | roleKey | audit |
| `identity.account.locked/unlocked` | identityId | security |
| `identity.email.*` | email | notifications |

**Retry / idempotency:** Event bus subscriber strategies (`event_subscriber`, retention per registry).

**Ordering:** Best-effort per identity; not globally ordered.

**Version:** Platform event registry `version` field (currently V1 contracts).
