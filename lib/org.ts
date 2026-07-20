/**
 * @deprecated Import from `@/lib/auth/organization-context` for new code.
 * This module re-exports the single Organization Context subsystem and
 * preserves legacy helpers used during the consolidation migration.
 */

import type { OrganizationContext } from "@/lib/auth/organization-context";
import {
  getCurrentOrganization,
  getCurrentOrganizationId,
  getOrganizationContext,
  orgWhere,
  orgWhereActive,
  orgWhereInt,
  requireOrganization,
  validateMembership,
} from "@/lib/auth/organization-context";
import { getLegacyCatalogScopeId, getLegacyIntOrgId } from "@/lib/auth/migration-compat";

export {
  getOrganizationContext,
  getCurrentOrganization,
  getCurrentOrganizationId,
  requireOrganization,
  validateMembership,
  orgWhere,
  orgWhereActive,
  orgWhereInt,
};
export type { OrganizationContext };

/**
 * @deprecated Use getOrganizationContext() / requireOrganization().
 * Sync helper for call sites that only have a session object (no await).
 * Does NOT load memberships — prefer async context API.
 */
export function getOrgIds(session: any): {
  uuidOrgId: string;
  intOrgId: number;
  tenantId: string | null;
} {
  const user = session?.user as any;
  const uuidOrgId =
    user?.organization_id ||
    user?.tenant_id ||
    getLegacyCatalogScopeId();
  const intOrgId = getLegacyIntOrgId();
  const tenantId = user?.tenant_id || null;
  return { uuidOrgId, intOrgId, tenantId };
}

/**
 * @deprecated Use getOrganizationContext() / requireOrganization().
 */
export function getOrgFromSession(session: any): {
  tenantId: string | null;
  orgId: string;
  userId: number | null;
  isSuperuser: boolean;
} {
  const user = session?.user as any;
  return {
    tenantId: user?.tenant_id || null,
    orgId: user?.organization_id || user?.tenant_id || getLegacyCatalogScopeId(),
    userId: user?.id ? parseInt(String(user.id), 10) : null,
    isSuperuser: !!user?.is_superuser,
  };
}

export function canManageOrg(session: any, targetTenantId: string): boolean {
  const user = session?.user as any;
  if (user?.is_superuser) return true;
  return user?.tenant_id === targetTenantId || user?.organization_id === targetTenantId;
}
