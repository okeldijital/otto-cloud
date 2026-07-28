# Platform Milestone A.0 Complete — Identity Platform Foundation

| Field | Value |
|-------|--------|
| Status | Implemented (foundation) |
| Date | 2026-07-29 |
| Next | [A.1 Authentication](./milestone-iam-a1-complete.md) ✅ |

---

## Delivered

- Package `lib/platform/identity/` with domain, crypto, credentials policy, authorization PermissionSet, permissions catalog, services, events  
- New parallel schema `iam_*` (identities, credentials, sessions, orgs, roles, permissions, invitations, MFA, recovery, tokens, security events)  
- Argon2id hashing, secure tokens, AES-GCM secret box for MFA secrets  
- Identity event names registered on Platform Event Bus  
- Legacy auth documented as frozen dual-run surface  
- ADRs 022–027 + architecture docs  
- Tests: `npm run test:identity`  

## Pre-A.1 structural follow-up (same track)

- Identity domain vs `authentication/` subsystem  
- `lib/platform/config` for security policy  
- ADR-028: A.1 is native auth, **not** NextAuth  

## Explicitly not yet

Login/logout UI · session cookies · MFA flows · invitations UI · admin security console · cutover from next-auth  

## Ops

```bash
npx prisma migrate deploy
# set IAM_ENCRYPTION_KEY in production (32-byte key)
```

Migration: `20260729010000_iam_identity_platform`
