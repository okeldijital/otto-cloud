# Platform Milestone A.1 Complete — Authentication

| Field | Value |
|-------|--------|
| Status | Implemented |
| Date | 2026-07-28 |
| Previous | [A.0 Foundation](./milestone-iam-a0-complete.md) |
| Next | A.2 Password Reset |

---

## Delivered

### Services (`lib/platform/identity/authentication/`)

| Service | Responsibility |
|---------|----------------|
| `AuthenticationService` | Login / logout orchestration |
| `SessionService` | Session create, refresh rotation, revoke |
| `TokenService` | Access tokens (HMAC) + opaque token hashing |
| `CookieService` | HttpOnly / Secure / SameSite cookies |
| `EmailVerificationService` | Single-use hashed verification tokens |
| `RateLimitService` | Login / refresh / resend limits |
| `LockoutService` | Failed-attempt lockout + admin unlock |
| `CurrentIdentityService` | Single request context resolution |

### API routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | IAM login + secure cookies |
| POST | `/api/auth/logout` | Revoke session, clear cookies |
| GET | `/api/auth/session` | Frontend SSOT for auth state |
| POST | `/api/auth/refresh` | Refresh token rotation |
| POST | `/api/auth/verify-email/request` | Issue verification token |
| GET/POST | `/api/auth/verify-email` | Consume verification token |
| POST | `/api/auth/resend-verification` | Resend (rate limited) |

### Middleware helpers

`requireAuthentication` · `requireActiveSession` · `requireEmailVerification` · `requireOrganization` · `requirePermission`

### Frontend

- `/auth/login`
- `/auth/verify-email`
- `/auth/check-email`
- `AuthContext` prefers `GET /api/auth/session`; dual-run falls back to next-auth for unmigrated users

### Platform events

All A.1 events published via Platform Event Bus + `iam_security_events`:

- `identity.login.success` / `identity.login.failed` / `identity.logout`
- `identity.session.created` / `refreshed` / `revoked`
- `identity.email.verification.sent` / `identity.email.verified`
- `identity.account.locked` / `unlocked`

### Dual-run

- IAM identity present → native auth only
- Legacy-only user → `LEGACY_AUTH_REQUIRED` → next-auth credentials
- No mixed session sources

---

## Out of scope (later)

| Milestone | Scope |
|-----------|--------|
| A.2 | Password reset |
| A.3 | Session management UI / logout-all UI |
| A.4 | MFA |

---

## Config

Policy from `getPlatformConfig().security.*` (not hard-coded):

- Access token: `session.accessTokenMinutes` (default 15)
- Refresh: `session.refreshTokenDays` (default 30)
- Remember-me: extends within `rememberMeDays`
- Lockout: 5 attempts / 15 minutes (env-overridable)
- Cookies: HttpOnly, Secure in production, SameSite=Lax

Flags:

- `FEATURE_IAM_NATIVE_AUTH` — prefer new UI
- `FEATURE_LEGACY_NEXT_AUTH` — dual-run (default on until cutover)

---

## Tests

```bash
npm run test:identity
```

---

## Explicitly not done

- Production email delivery (dev logs verification URL)
- Removing next-auth (dedicated cleanup milestone)
- Session list UI (A.3)
- MFA (A.4)
