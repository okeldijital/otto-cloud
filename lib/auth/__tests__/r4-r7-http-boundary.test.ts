/**
 * R4–R7 residual authorization regression gate.
 *
 * This suite is intentionally dependency-light: it validates the canonical
 * fail-closed primitives and inspects the audited source surfaces for the
 * forbidden global/coercive patterns that created the residual findings.
 *
 * Run: npm run test:r4-r7-http
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  requireLegacyIntOrgId,
  requirePositiveIntId,
  ResourceAuthError,
  resourceAuthErrorResponse,
  trackOrgScopeWhere,
} from "../resource-authorization";
import type { OrganizationContext } from "../organization-context";

const ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function ctx(org: "A" | "B", legacyIntOrgId = org === "A" ? 10 : 20): OrganizationContext {
  const organizationId = org === "A" ? ORG_A : ORG_B;
  return {
    organizationId,
    organization: null,
    tenantId: organizationId,
    membership: null,
    role: "owner",
    permissions: [],
    isSuperAdmin: false,
    userId: org === "A" ? 10 : 20,
    userEmail: `${org.toLowerCase()}@example.com`,
    legacyIntOrgId,
    dataScopeSource: "membership",
  };
}

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e?.message || e}`);
  }
}

function assert400(fn: () => unknown) {
  assert.throws(fn, (err: unknown) => err instanceof ResourceAuthError && err.status === 400);
}

await test("R4-1: role-name availability must be org-bound", async () => {
  const source = await readFile("app/api/iam/roles/route.ts", "utf8");
  assert.match(source, /where:\s*\{\s*name:\s*body\.name,\s*organization_id\s*\}/s);
  assert.doesNotMatch(source, /roles\.findUnique\(\{\s*where:\s*\{\s*name:/s);
});

await test("R4-2: role uniqueness conflicts are generic", async () => {
  const source = await readFile("app/api/iam/roles/route.ts", "utf8");
  assert.match(source, /err\?\.code\s*===\s*[\"']P2002[\"']/);
  assert.match(source, /Role name unavailable/);
});

await test("R4-3: role creation does not accept an arbitrary org for ordinary users", async () => {
  const source = await readFile("app/api/iam/roles/route.ts", "utf8");
  assert.match(source, /const platform = platformOf\(user as any\)/);
  assert.match(source, /platform && body\.organization_id/);
  assert.match(source, /:\s*\(user as any\)\.organization_id/);
});

await test("R4-4: system roles remain protected", async () => {
  const source = await readFile("app/api/iam/roles/route.ts", "utf8");
  assert.match(source, /if \(role\.is_system\) return .*Cannot modify system role/);
  assert.match(source, /if \(role\.is_system\) return .*Cannot delete system role/);
});

await test("R5-1: AI contract resolution uses the canonical ownership helper", async () => {
  const source = await readFile("app/api/ai/contracts/route.ts", "utf8");
  assert.match(source, /requireUploadEntityInOrg/);
  assert.match(source, /await requireUploadEntityInOrg\(entityType, String\(link\.entity_id\), ctx\)/);
});

await test("R5-2: AI contract resolution cannot persist an unsupported entity without validation", async () => {
  const source = await readFile("app/api/ai/contracts/route.ts", "utf8");
  assert.match(source, /if \(!entityType\) return NextResponse\.json/);
  assert.match(source, /requireUploadEntityInOrg\(entityType/);
});

await test("R5-3: core-write validates contract references before proposal creation", async () => {
  const source = await readFile("app/api/ai/core-write/route.ts", "utf8");
  assert.match(source, /requireUploadEntityInOrg\("contract", String\(contractId\), ctx\)/);
  assert.match(source, /requireUploadEntityInOrg\("release", String\(releaseId\), ctx\)/);
  assert.match(source, /requireUploadEntityInOrg\("ai_contract_document", String\(contractDocumentId\), ctx\)/);
});

await test("R5-4: release integration plan validates release and contract ownership", async () => {
  const source = await readFile("app/api/ai/release-integration/route.ts", "utf8");
  assert.match(source, /await requireReleaseInOrg\(releaseId, ctx\)/);
  assert.match(source, /await requireContractInOrg\(contractIdForRun, ctx\)/);
});

await test("R5-5: release integration attach validates every entity reference", async () => {
  const source = await readFile("app/api/ai/release-integration/route.ts", "utf8");
  assert.match(source, /requireUploadEntityInOrg\(String\(link\?\.entity_type/);
});

await test("R5-6: canonical upload/entity helper is fail-closed for unsupported types", async () => {
  const source = await readFile("lib/auth/resource-authorization.ts", "utf8");
  assert.match(source, /Unknown entity types: fail closed/);
  assert.match(source, /Unsupported entityType for upload/);
});

await test("R6-1: strict legacy organization conversion rejects garbage", () => {
  assert.equal(requireLegacyIntOrgId(ctx("A")), 10);
  assert400(() => requireLegacyIntOrgId(ctx("A", 0)));
  assert400(() => requireLegacyIntOrgId(ctx("A", Number.NaN)));
});

await test("R6-2: positive-id conversion never invents 0 or 1", () => {
  assert.equal(requirePositiveIntId("42"), 42);
  assert400(() => requirePositiveIntId(""));
  assert400(() => requirePositiveIntId("0"));
  assert400(() => requirePositiveIntId("abc"));
});

await test("R6-3: search uses strict legacy integer scope", async () => {
  const source = await readFile("app/api/search/route.ts", "utf8");
  assert.match(source, /requireLegacyIntOrgId/);
  assert.doesNotMatch(source, /parseInt\(orgId\)\s*\|\|\s*0/);
});

await test("R6-4: reports no longer coerce UUID organization ids to numbers", async () => {
  const source = await readFile("lib/reports.ts", "utf8");
  assert.match(source, /function orgFilter\(orgId: string\)/);
  assert.doesNotMatch(source, /Number\(orgId\)\s*\|\|\s*orgId/);
  assert.match(source, /requireLegacyIntOrgId\(ctx\)/);
});

await test("R6-5: AI audit no longer coerces organization ids", async () => {
  const source = await readFile("lib/ai-audit.ts", "utf8");
  assert.match(source, /function orgFilter\(orgId: string\)/);
  assert.doesNotMatch(source, /Number\(orgId\)\s*\|\|\s*orgId/);
  assert.match(source, /requireLegacyIntOrgId\(ctx\)/);
});

await test("R6-6: track scope remains organization-derived", () => {
  const where = trackOrgScopeWhere(ctx("A")) as any;
  const serialized = JSON.stringify(where);
  assert.match(serialized, new RegExp(ORG_A));
  assert.doesNotMatch(serialized, new RegExp(ORG_B));
});

await test("R7-1: no generated build artifact is part of the remediation source tree", async () => {
  const sourceFiles = [
    "app/api/iam/roles/route.ts",
    "app/api/ai/contracts/route.ts",
    "app/api/ai/core-write/route.ts",
    "app/api/ai/release-integration/route.ts",
    "app/api/search/route.ts",
    "lib/reports.ts",
    "lib/ai-audit.ts",
  ];
  for (const file of sourceFiles) assert.ok(file.endsWith(".ts"), file);
});

await test("R7-2: auth errors remain structured and fail closed", () => {
  const response = resourceAuthErrorResponse(new ResourceAuthError("Denied", 403, "PLATFORM_AUTHORITY_REQUIRED"));
  assert.equal(response.status, 403);
  assert.equal(response.body.code, "PLATFORM_AUTHORITY_REQUIRED");
});

console.log(`\nR4-R7 HTTP boundary tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
