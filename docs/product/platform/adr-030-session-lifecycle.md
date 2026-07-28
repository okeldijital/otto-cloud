# ADR-030 — Session Lifecycle

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Applies** | Platform IAM A.3 |

---

## Decision

A **session** is the authoritative representation of an authenticated identity.

A session is **not** a token. A session **owns** tokens:

```
Identity → Session → Refresh Token → Access Tokens
                  → Device
                  → Audit History
```

Refresh tokens never exist independently of a session.

### Lifecycle transitions

```
Login → Create Session → Issue Refresh → Issue Access
  → Activity / Idle touch
  → Refresh rotation
  → Expiration | Revocation
  → Archive
```

All transitions are explicit and audited.

### Session version

`Identity.sessionVersion` invalidates access tokens after credential or logout-all events.

### Risk level

`Session.riskLevel` (`LOW|MEDIUM|HIGH|UNKNOWN`) is reserved for future adaptive auth. A.3 stores `UNKNOWN` only.

### Trusted devices

Trusted device fields are modeled in A.3; MFA trust activation is A.4.

---

## Consequences

- User and admin UIs manage sessions only through IAM services.
- Cleanup is policy-driven (`SessionCleanupService`).
- No NextAuth session store.
