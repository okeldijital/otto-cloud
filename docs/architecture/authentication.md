# Authentication

| Field | Value |
|-------|--------|
| **Package** | `lib/platform/identity/authentication` |
| **ADR** | [ADR-028](../product/platform/adr-028-authentication-strategy.md) |

## Principle

Authentication proves Identity. It is not the Identity domain itself.

## Model

```
Identity → Credential → Authentication → Session → Authorization
```

## Session model

```
Identity → Session → Refresh Token → Access Token (optional short-lived)
```

## A.1 status — implemented

- **Do not use NextAuth** for the new stack  
- Argon2id (already in `authentication/crypto`)  
- HttpOnly cookies; Secure in production  
- Refresh rotation with reuse detection  
- Email verification (hashed, single-use, expiring)  
- Account lockout + rate limiting  
- Events: `identity.login.*`, `identity.session.*`, `identity.email.*`, `identity.account.*` via Platform Event Bus  
- Frontend SSOT: `GET /api/auth/session`  

See [milestone-iam-a1-complete.md](../product/platform/milestone-iam-a1-complete.md).

## Policy source

`getPlatformConfig().security.session` · `.password` · `.lockout` · `.tokens`
