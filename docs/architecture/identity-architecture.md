# Identity Architecture

| Field | Value |
|-------|--------|
| **Package** | `lib/platform/identity` |
| **Status** | A.0 foundation + A.1 authentication |
| **ADR** | [ADR-028](../product/platform/adr-028-authentication-strategy.md) |

## Identity vs Authentication

| Layer | Responsibility |
|-------|----------------|
| **Identity** | Principal, org membership, roles, permissions, domain events |
| **Authentication** | Passwords, sessions, MFA, invitations, tokens, recovery |

```
lib/platform/identity/
├── domain/
├── authorization/
├── organizations/
├── permissions/
├── events/
├── services/              # IdentityService (who)
└── authentication/        # proof of identity
      ├── passwords/
      ├── sessions/
      ├── mfa/
      ├── invitations/
      ├── recovery/
      ├── email/
      ├── tokens/
      └── crypto/
```

## Why this split

Passkeys, Google/Microsoft/Okta SSO, GitHub, API keys, and service accounts are **authentication** mechanisms. They must not require changing the Identity model.

## A.1 stack (native, not NextAuth)

```
POST /api/auth/login
  → IdentityService
  → AuthenticationService
  → SessionService
  → CookieService
  → Response + Platform Events
```

## Config

Security policy lives in `lib/platform/config` — not hard-coded in services.

## Dual-run

Legacy next-auth: [legacy-archive](../platform/identity/legacy-archive/README.md)
