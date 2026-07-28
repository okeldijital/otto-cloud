# Platform Milestone A.5 Complete — Organization Membership & RBAC

| Field | Value |
|-------|--------|
| Status | Implemented |
| Date | 2026-07-28 |
| ADR | [ADR-033](./adr-033-organization-membership-rbac.md) |
| Prior | [A.4.5 Cutover](./milestone-iam-cutover.md) |

## Delivered

- Membership lifecycle (create, suspend, reactivate, remove, ownership transfer)  
- Invitations (create, cancel, accept, decline)  
- Organization switch without re-auth  
- AuthorizationService + PermissionResolver + cache  
- Expanded permission catalog + system roles  
- Admin + settings UIs  
- Events + membership audit table  

## Migration

`20260729160000_iam_a5_org_rbac`

```bash
npx prisma migrate deploy
npm run test:identity
```

## Tag

Recommended: `iam-rbac`
