# Platform Milestone A.4.5 Complete — IAM Stabilization & Legacy Cutover

| Field | Value |
|-------|--------|
| Status | Implemented |
| Date | 2026-07-28 |
| Prior | [A.4 MFA](./milestone-iam-a4-complete.md) |
| ADR | [ADR-032 IAM Cutover](./adr-032-iam-cutover.md) |
| Next | A.5 Organization Membership & RBAC Enforcement (deepen, not re-platform) |

---

## Objective

IAM is the **only** authentication provider. NextAuth/Auth.js is gone.

## Deliverables summary

### Migration

| Item | Detail |
|------|--------|
| Script | `npm run migrate:legacy-auth` |
| Report | `npm run migrate:legacy-auth:report` |
| Password rule | Compatible path → Argon2id; else forced reset |
| Bridge | `legacyUserId` / `legacyTenantId` for data, not auth |

### Removed

- `next-auth` package  
- `[...nextauth]` route  
- `authOptions` stub  
- Dual-run legacy login path  
- Dead localStorage SessionContext auth  

### Single auth path

```
AuthContext → GET /api/auth/session
API → requireAuthentication / requirePermission / AuthenticationContext
```

### Audits (docs)

| Doc | Path |
|-----|------|
| Inventory | `docs/platform/identity/legacy-auth-inventory.md` |
| Removal | `docs/platform/identity/legacy-removal.md` |
| Migration | `docs/platform/identity/migration-guide.md` |
| Authorization | `docs/platform/identity/authorization-audit.md` |
| Org isolation | `docs/platform/identity/organization-isolation.md` |
| Security | `docs/platform/identity/security-review.md` |
| Performance | `docs/platform/identity/performance-review.md` |
| Pen checklist | `docs/platform/identity/penetration-checklist.md` |

### Tests

```bash
npm run test:identity
# includes cutover-a45.test.ts
```

## Confirmations

| Statement | Status |
|-----------|--------|
| Codebase does not depend on NextAuth/Auth.js | ✅ |
| IAM is SSOT for identity, authn, authz, sessions, MFA | ✅ |
| Protected APIs can use standardized IAM middleware | ✅ |
| Legacy User tables remain for business data only | ✅ documented |
| Residual role-string bridges | ⚠️ documented; no new ones |

## Ops before production

1. `npx prisma migrate deploy`  
2. Set `IAM_ENCRYPTION_KEY` (stop relying on `NEXTAUTH_SECRET`)  
3. `npm run migrate:legacy-auth:report -- --migrate`  
4. Communicate password reset to users with randomized passwords  
5. Seed org roles: `seedOrgSystemRoles`  
6. Run staging post-cutover checklist  
