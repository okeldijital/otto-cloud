# ADR-023 — Authentication Architecture

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Phase** | A.1–A.2 |

## Decision

Replace credentials login with IAM-native flows:

- Email/password (Argon2id)  
- HttpOnly secure cookies  
- Refresh token rotation  
- Email verification  
- Password reset tokens (hashed at rest)  

MFA is A.4; not required for basic auth.

## Non-goals (this ADR)

SSO / OIDC providers (future), passkeys (future).
