/**
 * OTTO Platform Identity & Access Management
 *
 * Phase A.0 — Foundation: schema, crypto, domain, permission catalog.
 * Phases A.1+ implement login, sessions, MFA, RBAC enforcement, invitations UI.
 *
 * Legacy next-auth / lib/auth.ts remains active until cutover.
 * See: docs/platform/identity/legacy-archive/README.md
 */

export * from "./domain/types";
export * from "./crypto";
export * from "./config";
export {
  validatePasswordStrength,
  assertPasswordStrength,
} from "./credentials/password-policy";
export {
  PERMISSION_CATALOG,
  SYSTEM_ROLE_TEMPLATES,
  isKnownPermission,
} from "./permissions/catalog";
export type { PermissionKey } from "./permissions/catalog";
export { PermissionSet } from "./authorization/permissions";
export { IDENTITY_EVENTS } from "./events/catalog";
export type { IdentityEventType } from "./events/catalog";
export { identityService, IdentityService } from "./services/identity-service";
export {
  seedIamPermissions,
  seedOrgSystemRoles,
} from "./services/permission-seed";
