/**
 * Migration compatibility layer for Organization Context.
 *
 * THE ONLY module allowed to know about the legacy catalog scope UUID
 * introduced by desktop → cloud import (CLOUD_ORG_UUID / DB default).
 *
 * Removal criteria (delete this file when all are true):
 * 1. Every UUID-scoped catalog row.organization_id equals a real tenants.id
 * 2. No env override LEGACY_CATALOG_SCOPE_ID is required in production
 * 3. Validation report confirms counts under real org ids
 * 4. ADR-001 checklist item for compat removal signed off
 *
 * @see docs/architecture/decisions/ADR-001-isolation-boundary.md
 * @see docs/architecture/multi-tenant-model.md §6
 */

import { createHash } from "node:crypto";

/** Env key for the imported catalog's organization_id value */
const LEGACY_SCOPE_ENV = "LEGACY_CATALOG_SCOPE_ID";

/** Env key for comma-separated tenant UUIDs that own the legacy catalog */
const LEGACY_OWNERS_ENV = "LEGACY_CATALOG_OWNER_ORG_IDS";

/** Env key for integer organization_id used by contracts/individuals/etc. */
const LEGACY_INT_ORG_ENV = "LEGACY_INT_ORG_ID";

/**
 * Historical default used by Prisma `@default(dbgenerated(...))` and the
 * migrate-data framework when CLOUD_ORG_UUID was unset. Must not appear
 * anywhere else in application code.
 */
const BUILTIN_LEGACY_CATALOG_SCOPE = "00000000-0000-0000-0000-000000000001";

/**
 * Placeholder written on users who registered without joining an organization.
 * Must NOT equal the legacy catalog scope (would leak imported data).
 * Remove when users.organization_id becomes nullable.
 */
const UNASSIGNED_USER_ORG = "00000000-0000-0000-0000-000000000000";

/** Synthetic compatibility scopes live outside the historical 1..999999 range. */
const SYNTHETIC_INT_SCOPE_MIN = 100000000;
const SYNTHETIC_INT_SCOPE_RANGE = 2000000000 - SYNTHETIC_INT_SCOPE_MIN;

export function getUnassignedUserOrganizationId(): string {
  return UNASSIGNED_USER_ORG;
}

export function isUnassignedUserOrganizationId(id: string | null | undefined): boolean {
  return !!id && id === UNASSIGNED_USER_ORG;
}

function parseOwnerSet(): Set<string> {
  const raw = process.env[LEGACY_OWNERS_ENV] || "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set(ids);
}

/**
 * UUID written on imported artists/releases/works/etc.
 * Prefer LEGACY_CATALOG_SCOPE_ID; fall back to the built-in import default.
 */
export function getLegacyCatalogScopeId(): string {
  const fromEnv = process.env[LEGACY_SCOPE_ENV]?.trim();
  if (fromEnv) return fromEnv;
  return BUILTIN_LEGACY_CATALOG_SCOPE;
}

function parseConfiguredLegacyIntOrgId(): number | null {
  const raw = process.env[LEGACY_INT_ORG_ENV];
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveLegacyTenantId(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Generate a stable integer compatibility scope for an IAM organization that
 * has no legacy numeric tenant id yet. This prevents all new organizations
 * from silently sharing the historical INT scope (previously every org fell
 * back to 1). The value is deterministic for the org UUID and deliberately
 * lives outside the historical legacy range.
 *
 * This is a compatibility boundary, not the canonical tenant identifier.
 * New code must continue using the UUID organization id.
 */
function syntheticLegacyIntOrgId(organizationId: string): number {
  const digest = createHash("sha256").update(organizationId).digest();
  const raw = digest.readUInt32BE(0);
  return SYNTHETIC_INT_SCOPE_MIN + (raw % SYNTHETIC_INT_SCOPE_RANGE);
}

/**
 * Integer organization_id for legacy INT-scoped tables (contracts, individuals,
 * audit logs, etc.). The old implementation returned a process-wide `1`,
 * which made every IAM organization share the same legacy rows.
 *
 * Resolution order:
 * 1. An actual legacyTenantId stored on the selected organization.
 * 2. The configured legacy INT scope, but only for the explicitly mapped
 *    legacy catalog organization.
 * 3. A stable synthetic scope derived from the selected organization UUID.
 *
 * Passing no organization identity preserves the old configured value only
 * for backwards compatibility with isolated migration tooling; request
 * authorization paths must always pass the active organization.
 */
export function getLegacyIntOrgId(
  legacyTenantId?: unknown,
  organizationId?: string | null
): number {
  const mappedLegacyTenantId = parsePositiveLegacyTenantId(legacyTenantId);
  if (mappedLegacyTenantId) return mappedLegacyTenantId;

  const configured = parseConfiguredLegacyIntOrgId();
  if (organizationId) {
    const isExplicitLegacyOwner =
      organizationId === getLegacyCatalogScopeId() || parseOwnerSet().has(organizationId);
    if (configured && isExplicitLegacyOwner) return configured;
    return syntheticLegacyIntOrgId(organizationId);
  }

  return configured ?? 1;
}

export function isLegacyCatalogScopeId(id: string | null | undefined): boolean {
  if (!id) return false;
  return id === getLegacyCatalogScopeId();
}

/**
 * Map an Organization (tenants.id) to the UUID used in catalog `organization_id` filters.
 *
 * - If the org is listed in LEGACY_CATALOG_OWNER_ORG_IDS → legacy scope
 * - If the org id already equals the legacy scope (user.organization_id still on import UUID) → legacy scope
 * - Otherwise → org id itself (new multi-org model)
 */
export function resolveCatalogOrganizationId(organizationId: string): string {
  if (!organizationId) {
    throw new Error("resolveCatalogOrganizationId: organizationId is required");
  }

  const legacy = getLegacyCatalogScopeId();
  if (organizationId === legacy) return legacy;

  const owners = parseOwnerSet();
  if (owners.size > 0 && owners.has(organizationId)) {
    return legacy;
  }

  return organizationId;
}

/**
 * Whether this org should see the imported (legacy-scoped) catalog.
 * When LEGACY_CATALOG_OWNER_ORG_IDS is empty, only the legacy id itself owns it.
 */
export function orgOwnsLegacyCatalog(organizationId: string): boolean {
  const owners = parseOwnerSet();
  if (owners.size === 0) {
    return organizationId === getLegacyCatalogScopeId();
  }
  return owners.has(organizationId) || organizationId === getLegacyCatalogScopeId();
}

/**
 * For users who still have organization_id = legacy UUID and no tenant membership
 * that maps cleanly, allow catalog access via compat (superadmin or legacy user).
 */
export function allowLegacyUserScope(params: {
  userOrganizationId: string | null | undefined;
  isSuperAdmin: boolean;
}): boolean {
  if (!params.userOrganizationId) return false;
  if (params.userOrganizationId === getLegacyCatalogScopeId()) return true;
  return false;
}

export const migrationCompatMeta = {
  envKeys: [LEGACY_SCOPE_ENV, LEGACY_OWNERS_ENV, LEGACY_INT_ORG_ENV] as const,
  builtinLegacyCatalogScope: BUILTIN_LEGACY_CATALOG_SCOPE,
  removalDoc: "docs/architecture/multi-tenant-model.md §6",
};
