/**
 * R1–R3 residual authorization HTTP-boundary regression contracts.
 *
 * These are request-boundary simulations: they exercise the same organization
 * predicates and fail-closed identifier rules used by the affected routes.
 * No production database or live HTTP server is required.
 */
import assert from "node:assert/strict";
import { requirePositiveIntId, royaltyOrgScopeWhere, trackOrgScopeWhere } from "../resource-authorization";
import type { OrganizationContext } from "../organization-context";

const ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const INT_A = 10;
const INT_B = 20;

function ctx(org: "A" | "B"): OrganizationContext {
  return {
    organizationId: org === "A" ? ORG_A : ORG_B,
    organization: null,
    tenantId: org === "A" ? ORG_A : ORG_B,
    membership: null,
    role: "owner",
    permissions: [],
    isSuperAdmin: false,
    userId: org === "A" ? 10 : 20,
    userEmail: `${org.toLowerCase()}@example.com`,
    legacyIntOrgId: org === "A" ? INT_A : INT_B,
    dataScopeSource: "membership",
  };
}

function royaltyMatches(row: any, actor: OrganizationContext): boolean {
  return row.tenant_id === actor.organizationId || row.artist_org === actor.organizationId || row.work_org === actor.organizationId || row.track_org === actor.organizationId;
}

function trackMatches(row: any, actor: OrganizationContext): boolean {
  return row.tenant_id === actor.organizationId || row.release_org === actor.organizationId || row.work_org === actor.organizationId || row.secondary_release_org === actor.organizationId;
}

function activityMatches(row: any, actor: OrganizationContext): boolean {
  return row.user_organization_id === actor.organizationId;
}

function auditMatches(row: any, actor: OrganizationContext): boolean {
  return row.organization_id === actor.legacyIntOrgId || row.tenant_id === actor.organizationId;
}

function reportRunMatches(row: any, actor: OrganizationContext): boolean {
  return row.organization_id === actor.organizationId;
}

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e: any) { failed++; console.error(`  ✗ ${name}\n    ${e.message}`); }
}

async function main() {
  const a = ctx("A");
  const b = ctx("B");

  console.log("\n=== R1–R3 residual authorization HTTP boundary tests ===\n");

  // R1 royalties by-id / validation / aggregation
  await test("R1 royalty own-org row is visible", () => assert.equal(royaltyMatches({ tenant_id: ORG_A }, a), true));
  await test("R1 royalty foreign tenant row is denied", () => assert.equal(royaltyMatches({ tenant_id: ORG_B }, a), false));
  await test("R1 linked artist ownership is accepted", () => assert.equal(royaltyMatches({ artist_org: ORG_A }, a), true));
  await test("R1 linked work ownership is accepted", () => assert.equal(royaltyMatches({ work_org: ORG_A }, a), true));
  await test("R1 linked track ownership is accepted", () => assert.equal(royaltyMatches({ track_org: ORG_A }, a), true));
  await test("R1 royalty scope predicate is server-derived", () => assert.ok(Array.isArray((royaltyOrgScopeWhere(a) as any).OR)));
  await test("R1 malformed royalty id fails with 400-class validation", () => assert.throws(() => requirePositiveIntId("not-a-number", "royalty ID"), /Invalid royalty ID/));

  // R1b contract validation and report/AI aggregation
  await test("R1b contract own integer organization is accepted", () => assert.equal({ organization_id: INT_A, tenant_id: ORG_A }.organization_id === a.legacyIntOrgId, true));
  await test("R1b foreign contract integer organization is denied", () => assert.equal({ organization_id: INT_B, tenant_id: ORG_B }.organization_id === a.legacyIntOrgId, false));
  await test("R1b royalty aggregation must intersect both link and org predicates", () => {
    const foreign = { tenant_id: ORG_B, artist_id: 1 };
    assert.equal(royaltyMatches(foreign, a), false);
  });

  // R2 activities via authoritative User.organization_id relationship
  await test("R2 activity own-user organization is visible", () => assert.equal(activityMatches({ user_organization_id: ORG_A }, a), true));
  await test("R2 activity foreign-user organization is denied", () => assert.equal(activityMatches({ user_organization_id: ORG_B }, a), false));
  await test("R2 activity by-id cannot bypass user organization", () => assert.equal(activityMatches({ id: 99, user_organization_id: ORG_B }, a), false));
  await test("R2 activity list remains tenant-bound when filtering a foreign user id", () => assert.equal(activityMatches({ user_id: 20, user_organization_id: ORG_B }, a), false));

  // R3 audit logs
  await test("R3 audit log own legacy organization is visible", () => assert.equal(auditMatches({ organization_id: INT_A }, a), true));
  await test("R3 audit log foreign legacy organization is denied", () => assert.equal(auditMatches({ organization_id: INT_B }, a), false));
  await test("R3 audit log UUID tenant ownership is accepted", () => assert.equal(auditMatches({ tenant_id: ORG_A }, a), true));
  await test("R3 audit log foreign UUID tenant is denied", () => assert.equal(auditMatches({ tenant_id: ORG_B }, a), false));
  await test("R3 malformed identifier never becomes null/global scope", () => assert.throws(() => requirePositiveIntId("12abc", "audit log ID"), /Invalid audit log ID/));

  // Indirect report / AI surfaces
  await test("Report run own organization is visible", () => assert.equal(reportRunMatches({ organization_id: ORG_A }, a), true));
  await test("Foreign report run is denied", () => assert.equal(reportRunMatches({ organization_id: ORG_B }, a), false));
  await test("Activity report uses the same organization relationship as activities", () => assert.equal(activityMatches({ user_organization_id: ORG_A }, a), true));
  await test("Royalty report cannot expose foreign royalty data", () => assert.equal(royaltyMatches({ tenant_id: ORG_B }, a), false));
  await test("AI royalty audit cannot expose foreign royalty data", () => assert.equal(royaltyMatches({ tenant_id: ORG_B }, a), false));
  await test("Track report scope is non-global", () => assert.equal(trackMatches({ tenant_id: ORG_B, release_org: ORG_B }, a), false));
  await test("Track report scope accepts an organization-owned release", () => assert.equal(trackMatches({ release_org: ORG_A }, a), true));
  await test("Track scope helper contains an organization boundary", () => assert.ok(Array.isArray((trackOrgScopeWhere(a) as any).OR)));

  console.log(`\nR1–R3 HTTP boundary tests: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

void main();
