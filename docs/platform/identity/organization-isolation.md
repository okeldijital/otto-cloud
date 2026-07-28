# Organization Isolation Audit (A.4.5)

## Rule

Every tenant-scoped query must filter by organization unless **explicitly global**.

## Resolution path

```
AuthenticationContext / getOrganizationContext()
  → organizationId (catalog UUID)
  → repository where clauses
```

## Verified patterns

| Layer | Mechanism |
|-------|-----------|
| API routes | `requireOrganization()` from `@/lib/auth/organization-context` |
| IAM | Membership + active org on access token `org` claim |
| Contract Center | `OrganizationContext` on lifecycle / documents / verification |
| Rights / Royalties | Org context on promote/review/search services |
| Platform events | `organizationId` on publish |

## IAM dual path

`getOrganizationContext` prefers:

1. IAM memberships (`iam_organization_memberships`) when identity has them  
2. Legacy `tenant_users` when `legacyUserId` is bridged  

## Explicit exceptions (global)

| Surface | Reason |
|---------|--------|
| Superadmin catalog views | Platform operators |
| Health / public invite accept | Pre-auth or token-gated |
| Permission catalog seed | Global template data |
| Event registry definitions | Global schema |

## Gaps / follow-ups

- Continue expanding `orgWhere()` usage on remaining legacy catalog routes  
- Prefer IAM membership over `tenant_users` once all users migrated  
- Document any new global route in this file  
