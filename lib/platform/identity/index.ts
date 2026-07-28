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
  PERMISSION_CATALOG_VERSION,
  isKnownPermission,
} from "./permissions/catalog";
export type { PermissionKey } from "./permissions/catalog";
export { PermissionSet } from "./authorization/permissions";
export {
  authorizationService,
  AuthorizationService,
} from "./authorization/AuthorizationService";
export {
  permissionResolver,
  PermissionResolver,
} from "./authorization/PermissionResolver";
export {
  effectivePermissionCache,
  EffectivePermissionCache,
  buildPermissionCacheKey,
} from "./authorization/EffectivePermissionCache";
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
} from "./organizations/OrganizationService";
export {
  membershipService,
  MembershipService,
} from "./organizations/MembershipService";
export {
  invitationService,
  InvitationService,
} from "./organizations/InvitationService";
export {
  organizationSwitchService,
  OrganizationSwitchService,
} from "./organizations/OrganizationSwitchService";
export {
  organizationPolicyService,
  OrganizationPolicyService,
} from "./organizations/OrganizationPolicyService";

// Authentication subsystem (proof) — includes requirePermission / requireMembership
export * from "./authentication";

// Re-export security config for convenience (source of truth: platform/config)
export {
  getPlatformConfig,
  getIamSecurityConfig,
  resetPlatformConfig,
} from "@/lib/platform/config";
