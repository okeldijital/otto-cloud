/**
 * OTTO Platform Identity
 *
 * Identity = business domain (who the principal is, org membership, permissions).
 * Authentication = proof of identity (passwords, sessions, MFA, future SSO/passkeys).
 *
 * A.1 must implement native auth — NOT NextAuth.
 * See: ADR-028 Authentication Strategy
 *
 * Legacy next-auth remains until cutover:
 * docs/platform/identity/legacy-archive/README.md
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

// Authentication subsystem (proof)
export * from "./authentication";

// Re-export security config for convenience (source of truth: platform/config)
export {
  getPlatformConfig,
  getIamSecurityConfig,
  resetPlatformConfig,
} from "@/lib/platform/config";
