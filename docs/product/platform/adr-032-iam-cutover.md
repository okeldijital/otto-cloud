# ADR-032 — IAM Cutover

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Applies** | Platform IAM A.4.5 |

---

## Decision

The **IAM platform** is the single source of truth for:

- Identity  
- Authentication  
- Authorization (permissions)  
- Sessions  
- MFA  

NextAuth/Auth.js is **fully removed**. There is no dual authentication provider.

### Request path

```
Client → IAM Auth APIs / cookies
      → CurrentIdentityService / AuthenticationContext
      → requireAuthentication / requirePermission
      → Business module
```

### Legacy data

`users` / `tenant_users` may remain for **catalog/business** bridging via `legacyUserId` / `legacyTenantId`. They are not authentication providers.

### Migration

`scripts/migrate-legacy-auth.ts` creates IAM identities from legacy users. Incompatible/unknown passwords force reset.

---

## Consequences

- No `next-auth` dependency  
- No role-string-only authorization in new code (prefer `permissions.has`)  
- Organization isolation via `OrganizationContext` / IAM membership  
- Events only through Platform Event Bus  
