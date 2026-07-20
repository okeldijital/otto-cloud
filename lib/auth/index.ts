/**
 * Auth subsystem public exports.
 * Organization scope: always use organization-context (not session fields).
 */
export {
  getOrganizationContext,
  getCurrentOrganization,
  getCurrentOrganizationId,
  requireOrganization,
  validateMembership,
  orgContextErrorResponse,
  orgWhere,
  orgWhereActive,
  orgWhereInt,
  OrganizationContextError,
} from "./organization-context";

export type {
  OrganizationContext,
  OrganizationSummary,
  MembershipSummary,
  OrgContextSource,
} from "./organization-context";

export {
  getLegacyCatalogScopeId,
  getLegacyIntOrgId,
  resolveCatalogOrganizationId,
  getUnassignedUserOrganizationId,
  migrationCompatMeta,
} from "./migration-compat";
