/**
 * Platform SDK — Authorization (IAM v1.0)
 */

export {
  authorizationService,
  AuthorizationService,
} from "@/lib/platform/identity/authorization/AuthorizationService";

export {
  permissionResolver,
  PermissionResolver,
  type ResolvedPermissions,
} from "@/lib/platform/identity/authorization/PermissionResolver";

export { PermissionSet } from "@/lib/platform/identity/authorization/permissions";

export {
  requirePermission,
  requireOrganization,
  requireMembership,
  requireOrganizationOwner,
} from "@/lib/platform/identity/authentication/middleware";
