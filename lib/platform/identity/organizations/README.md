# organizations/ — A.5 / A.6

- `organization-service.ts` — create org, memberships, roles, switch default  

RBAC: membership → role → permissions (`PERMISSION_CATALOG`, system templates).  
Enforcement: `requirePermission` / `requireOrganization` in authentication middleware.
