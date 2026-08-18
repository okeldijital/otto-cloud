/**
 * Tenant-isolation matrix for the cloud authorization boundary.
 *
 * This is intentionally database-free: it verifies the canonical predicates
 * that every legacy/shared-table authorization path must use. Route-specific
 * HTTP mirrors remain in A8/A9/R1-R7 suites.
 */

import assert from "node:assert/strict";
import {
  activityOrgScopeWhere,
  contractOrgScopeWhere,
  requireLegacyIntOrgId,
  requirePositiveIntId,
  royaltyOrgScopeWhere,
  trackOrgScopeWhere,
} from "../resource-authorization";
import type { OrganizationContext } from "../organization-context";

const ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const DIGIT_LEADING_ORG = "12345678-1234-1234-1234-123456789abc";

function ctx(organizationId: string, legacyIntOrgId: number): OrganizationContext {
  return {
    organizationId,
    organization: null,
    tenantId: organizationId,
    membership: null,
    role: "owner",
    permissions: [],
    isSuperAdmin: false,
    userId: 101,
    userEmail: "owner@example.com",
    legacyIntOrgId,
    dataScopeSource: "membership",
  };
}

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

function assertOrgBound(predicate: Record<string, unknown>, ownOrg: string, foreignOrg: string) {
  const json = serialize(predicate);
  assert.match(json, new RegExp(ownOrg));
  assert.doesNotMatch(json, new RegExp(foreignOrg));
}

// A tenant may only see rows whose server-derived predicate contains its own
// organization. A caller cannot inject ORG_B into an ORG_A context.
const a = ctx(ORG_A, 10);
const b = ctx(ORG_B, 20);

assertOrgBound(contractOrgScopeWhere(a), "10", "20");
assertOrgBound(contractOrgScopeWhere(b), "20", "10");

assertOrgBound(trackOrgScopeWhere(a), ORG_A, ORG_B);
assertOrgBound(trackOrgScopeWhere(b), ORG_B, ORG_A);

assertOrgBound(royaltyOrgScopeWhere(a), ORG_A, ORG_B);
assertOrgBound(royaltyOrgScopeWhere(b), ORG_B, ORG_A);

assertOrgBound(activityOrgScopeWhere(a), ORG_A, ORG_B);
assertOrgBound(activityOrgScopeWhere(b), ORG_B, ORG_A);

// Legacy integer scope must remain explicit. Missing/invalid scope is a hard
// authorization failure rather than a global query or invented tenant.
assert.equal(requireLegacyIntOrgId(a), 10);
assert.equal(requireLegacyIntOrgId(b), 20);
assert.throws(() => requireLegacyIntOrgId(ctx(ORG_A, 0)), /Organization integer scope is not available/);
assert.throws(() => requireLegacyIntOrgId(ctx(ORG_A, Number.NaN)), /Organization integer scope is not available/);

// UUIDs must never be coerced through parseInt. In particular, a UUID starting
// with digits must not become a different integer tenant scope.
assert.throws(() => requirePositiveIntId(DIGIT_LEADING_ORG, "organization_id"), /Invalid organization_id/);
assert.throws(() => requirePositiveIntId(ORG_A, "organization_id"), /Invalid organization_id/);

// Positive integer identifiers remain accepted, while malformed IDs fail
// deterministically with validation rather than leaking into Prisma as NaN.
assert.equal(requirePositiveIntId("10", "id"), 10);
assert.equal(requirePositiveIntId(20, "id"), 20);
for (const malformed of ["", "0", "-1", "1.5", "abc", "10abc", NaN, Infinity]) {
  assert.throws(() => requirePositiveIntId(malformed, "id"), /Missing id|Invalid id/);
}

console.log("✓ tenant-isolation-matrix: all canonical scope invariants passed");
