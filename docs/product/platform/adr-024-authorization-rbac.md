# ADR-024 — Authorization & RBAC

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Phase** | A.5–A.6 |

## Decision

Authorization is permission-based:

```
permissions.has("contracts.review")
```

not role-string equality.

Model:

```
Identity → OrganizationMembership → Role → Permission
```

Multi-org: memberships carry org-specific roles; active org selected in session context.
