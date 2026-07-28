/**
 * Platform SDK — Permission catalog (IAM v1.0)
 */

export {
  PERMISSION_CATALOG,
  SYSTEM_ROLE_TEMPLATES,
  PERMISSION_CATALOG_VERSION,
  isKnownPermission,
  type PermissionKey,
} from "@/lib/platform/identity/permissions/catalog";

export {
  seedIamPermissions,
  seedOrgSystemRoles,
} from "@/lib/platform/identity/services/permission-seed";

export type { PermissionDto, RoleDto } from "@/lib/platform/identity/contracts";
