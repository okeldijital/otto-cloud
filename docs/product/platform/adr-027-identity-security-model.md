# ADR-027 — Identity Security Model

| Field | Value |
|-------|--------|
| **Status** | Accepted |

## Mandatory controls

| Control | Implementation |
|---------|----------------|
| Password hash | Argon2id |
| Verify | Constant-time library verify |
| Tokens | CSPRNG + SHA-256 hash at rest |
| Cookies | HttpOnly; Secure in production; SameSite=Lax |
| MFA secrets | AES-256-GCM encrypted |
| Recovery codes | Hashed, single-use |
| Brute force | LoginAttempt + lockout |
| Rate limit | Configurable per-IP/email |
| Audit | SecurityEvent + Platform Event Bus |

## Environment

- `IAM_ENCRYPTION_KEY` — 32-byte key (required in production)  
- `NEXTAUTH_SECRET` may bootstrap dev encryption only  
