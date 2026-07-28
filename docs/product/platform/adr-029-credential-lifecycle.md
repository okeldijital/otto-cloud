# ADR-029 — Credential Lifecycle

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Applies** | Platform IAM A.2 |

---

## Decision

Passwords are **credentials**. Authentication **consumes** credentials; it does not mutate them.

All password mutations flow through:

```
API → CredentialLifecycleService → PasswordService / PasswordResetService / PasswordHistoryService
     → PasswordRepository → iam_* tables
```

### Session invalidation

`IamIdentity.sessionVersion` increments on password change, reset, and force-reset.

Access tokens embed `sv` (session version). `CurrentIdentityService` rejects tokens whose `sv` does not match the identity.

Additionally, sessions are revoked:

| Event | Current session | Other sessions |
|-------|-----------------|----------------|
| Change password | Kept | Revoked |
| Reset password | All revoked | All revoked |
| Force reset | All revoked | All revoked |

### Policy

All rules live in `getPlatformConfig().security.password` — no hard-coded thresholds in services.

---

## Consequences

- No service updates `iam_password_credentials` except via `PasswordRepository` used by the lifecycle layer.
- MFA / passkeys are separate credential types (later milestones).
- Legacy NextAuth receives no password enhancements.
