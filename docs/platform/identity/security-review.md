# Security Review (A.4.5)

## Authentication

| Control | Status |
|---------|--------|
| Argon2id passwords | ✅ |
| Refresh rotation + reuse detection | ✅ |
| Session version invalidation | ✅ |
| HttpOnly / Secure / SameSite cookies | ✅ |
| No user enumeration on forgot password | ✅ |
| Rate limiting (login, refresh, MFA, reset) | ✅ |
| Account lockout | ✅ |
| MFA challenge before session | ✅ |
| Recovery codes hashed single-use | ✅ |
| Encrypted TOTP secrets (AES-GCM) | ✅ |

## Authorization

| Control | Status |
|---------|--------|
| Permission middleware | ✅ available |
| Superuser bypass explicit | ✅ |
| Tenant isolation via org context | ✅ (audit residual legacy routes) |
| Role-string only checks | ⚠️ residual bridges documented |

## MFA

| Control | Status |
|---------|--------|
| Challenge expiry | ✅ |
| Max attempts | ✅ |
| Trusted device skip | ✅ |
| Replay recovery codes | ✅ rejected |

## API surface

| Control | Status |
|---------|--------|
| Anonymous health/register/login | Intentional |
| Admin routes require permissions | ✅ / ⚠️ seed roles |
| No NextAuth session forging | ✅ removed |

## Residual risks

1. Unmigrated legacy users cannot log in until `migrate-legacy-auth`  
2. Some business routes still use role bridges  
3. `NEXTAUTH_SECRET` fallback for encryption key — rotate to `IAM_ENCRYPTION_KEY`  

## Verdict

**Acceptable for IAM-only production** after user migration and `IAM_ENCRYPTION_KEY` set.
