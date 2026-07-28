# Platform Milestone A.2 Complete — Password Management

| Field | Value |
|-------|--------|
| Status | Implemented |
| Date | 2026-07-28 |
| Prior | [A.1 Authentication](./milestone-iam-a1-complete.md) |
| ADR | [ADR-029 Credential Lifecycle](./adr-029-credential-lifecycle.md) |

---

## Delivered

### Architecture

- `CredentialLifecycleService` — exclusive mutation path  
- `PasswordService`, `PasswordResetService`, `PasswordHistoryService`, `PasswordValidator`  
- `PasswordPolicyService` + expanded platform config  
- `PasswordRepository`  

### Capabilities

- Change password (keep current session, revoke others)  
- Forgot / reset (no enumeration, hashed single-use tokens)  
- Force reset (admin)  
- Password history (configurable depth, default 5)  
- Expiration policy (default off; 90 days via env)  
- Session versioning (`sessionVersion` on identity + `sv` in access tokens)  
- Platform events + security event audit trail  

### APIs

| Method | Path |
|--------|------|
| POST | `/api/auth/change-password` |
| POST | `/api/auth/forgot-password` |
| POST | `/api/auth/reset-password` |
| GET | `/api/auth/password-policy` |
| GET | `/api/auth/password/status` |
| POST | `/api/auth/password/force-reset` |

### UI

- `/settings/security/password`  
- `/auth/forgot-password`  
- `/auth/reset-password`  

### Schema migration

`20260729120000_iam_a2_password_lifecycle`

### Tests

```bash
npm run test:identity
```

Includes `password-a2.test.ts` (policy, entropy, session version claims, events).

---

## Explicit non-goals (this milestone)

MFA (A.4) · Passkeys · Session UI (A.3 already has basic UI) · Admin security dashboard polish · NextAuth removal (already done earlier)

## Dual-run note

Legacy NextAuth is not enhanced. Password management is IAM-only.
