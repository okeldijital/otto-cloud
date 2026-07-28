# Performance Review (A.4.5)

## Hot paths

| Path | Expected cost | Notes |
|------|---------------|-------|
| Login (password) | 1 identity + credential + Argon2id verify | Dominated by Argon2 |
| Login + MFA | + challenge write + TOTP verify | Challenge TTL short |
| GET /api/auth/session | session + identity + membership + role perms | Single resolution path |
| Access token verify | HMAC only | No DB |
| Session cookie resolve | 1 session lookup | When access expired |
| Refresh rotation | TX rotate tokens | Indexed token hash |
| requirePermission | Uses session perms if present | Avoids N+1 when context full |

## Optimizations already present

- Access token avoids DB on every request when valid + sessionVersion matches  
- Permission keys loaded with membership role once  
- Rate limits in-process (swap Redis multi-instance later)  

## Recommendations

1. Cache permission sets per `(identityId, orgId)` with short TTL if middleware load rises  
2. Bound session list / audit queries (already take limits)  
3. Cleanup job for expired sessions (`SessionCleanupService`) on schedule  
4. Monitor Argon2 latency under load; tune memoryCost if needed  

## Acceptance

No blocking performance issues for single-instance deploy. Multi-instance needs shared rate-limit store.
