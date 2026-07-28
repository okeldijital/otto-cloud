# AuthorizationService

Single decision point for allow/deny.

- Superadmin bypass  
- Owner grants for org admin keys  
- PermissionSet.hasAny for required keys  

Throws `IdentityError` with `PERMISSION_DENIED`.
