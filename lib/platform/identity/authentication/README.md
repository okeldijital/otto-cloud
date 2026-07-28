# Authentication (not Identity)

**Identity** is who the principal is.  
**Authentication** is how they prove it.

```
Identity  →  Credential  →  Authentication  →  Session  →  Authorization
```

## Layout

```
authentication/
  authentication-service.ts
  current-identity-service.ts
  middleware.ts
  events.ts
  passwords/     policy (reset A.2)
  sessions/      SessionService — create / rotate / revoke
  cookies/       CookieService
  tokens/        TokenService (access + opaque)
  lockout/       LockoutService
  rate-limit/    RateLimitService
  email/         EmailVerificationService
  mfa/           TOTP (A.4)
  invitations/   invite accept (A.7)
  recovery/      recovery codes
  crypto/        argon2id, secret-box, token hashing
```

## A.1 — Native auth (no NextAuth)

```
POST /api/auth/login
  → AuthenticationService
  → SessionService
  → CookieService
  → Platform Events
```

Frontend: `GET /api/auth/session` is the single source of truth.
