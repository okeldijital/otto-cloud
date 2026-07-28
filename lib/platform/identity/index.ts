/**
 * OTTO Platform Identity
 *
 * Identity = business domain (who the principal is, org membership, permissions).
 * Authentication = proof of identity (passwords, sessions, MFA, future SSO/passkeys).
 *
 * Native auth only — NextAuth removed at cutover.
 * See: ADR-028 Authentication Strategy
 */

// Domain
export * from "./domain/types";

// Authorization / RBAC (identity domain)
export {
  PERMISSION_CATALOG,
  SYSTEM_ROLE_TEMPLATES,
  isKnownPermission,
} from "./permissions/catalog";
export type { PermissionKey } from "./permissions/catalog";
export { PermissionSet } from "./authorization/permissions";
export { IDENTITY_EVENTS } from "./events/catalog";
export type { IdentityEventType } from "./events/catalog";

// Identity services
export { identityService, IdentityService } from "./services/identity-service";
export {
  seedIamPermissions,
  seedOrgSystemRoles,
} from "./services/permission-seed";
export {
  migrateLegacyUser,
  migrateAllLegacyUsers,
} from "./services/legacy-migration";

// Organizations / membership (A.5)
export {
  organizationService,
  OrganizationService,
} from "./organizations/organization-service";

// Authentication subsystem (proof)
export * from "./authentication";

// Re-export security config for convenience (source of truth: platform/config)
export {
  getPlatformConfig,
  getIamSecurityConfig,
  resetPlatformConfig,
} from "@/lib/platform/config";
