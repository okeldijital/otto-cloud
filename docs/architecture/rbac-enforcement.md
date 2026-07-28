# RBAC Enforcement

## Middleware

```ts
requireAuthentication()
requireActiveSession()
requireOrganization()
requireMembership()
requirePermission("contracts.review")
requireOrganizationOwner()
```

## Service

```ts
authorizationService.authorize(context, "rights.manage")
authorizationService.check(context, ["contracts.view", "rights.view"])
```

Business modules must not compare `role === "admin"`.
