# ADR-033 — Organization Membership & RBAC

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Applies** | Platform IAM A.5 |

---

## Decision

1. **Membership** is how identities access organizations.  
2. **Roles** assign **permissions**; business modules never inspect roles.  
3. Every protected action uses `AuthorizationService.authorize(context, permission)`.  
4. Every request may have exactly one **active organization** (switch without re-login).  
5. Effective permissions are cached with membership/role/catalog versions.

```
Identity → Membership → Role(s) → Permissions → AuthorizationService → Module
```

---

## Consequences

- Seed system roles per org: owner, administrator, manager, editor, reviewer, contributor, viewer  
- Invitation accept creates membership  
- Cache invalidates on role/membership/org switch  
