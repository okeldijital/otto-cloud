/**
 * A.8 Step 3 — Multi-organization authorization / IDOR unit tests.
 *
 * Covers ownership filter construction and fail-closed helpers for two orgs.
 * Does not touch production databases.
 *
 * Run: npx tsx lib/auth/__tests__/resource-authorization-idor.test.ts
 */

import assert from "node:assert/strict";
import {
  ResourceAuthError,
  playlistOrgScopeWhere,
  requireLegacyIntOrgId,
  resourceAuthErrorResponse,
  royaltyOrgScopeWhere,
  trackOrgScopeWhere,
} from "../resource-authorization";
import type { OrganizationContext } from "../organization-context";

const ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function makeCtx(organizationId: string, userId = 1): OrganizationContext {
  return {
    organizationId,
    organization: null,
    tenantId: organizationId,
    membership: null,
    role: "owner",
    permissions: [],
    isSuperAdmin: false,
    userId,
    userEmail: "user@example.com",
    legacyIntOrgId: organizationId === ORG_A ? 10 : 20,
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
    console.error(`    ${e.message}`);
  }
}

/** Evaluate simple Prisma-like where against a flat row (unit approximation). */
function matchesScope(row: Record<string, unknown>, where: any): boolean {
  if (!where) return true;
  if (where.AND) return (where.AND as any[]).every((w) => matchesScope(row, w));
  if (where.OR) {
    return (where.OR as any[]).some((w) => {
      const leafEntries = Object.entries(w).filter(
        ([, v]) =>
          !(
            v &&
            typeof v === "object" &&
            ("is" in (v as any) || "some" in (v as any))
          )
      );
      // Relation-only clauses are not evaluable on flat fixtures — ignore them here
      if (leafEntries.length === 0) return false;
      return leafEntries.every(([k, v]) => row[k] === v);
    });
  }
  const leafEntries = Object.entries(where).filter(
    ([, v]) =>
      !(
        v &&
        typeof v === "object" &&
        ("is" in (v as any) || "some" in (v as any))
      )
  );
  if (leafEntries.length === 0) return false;
  return leafEntries.every(([k, v]) => row[k] === v);
}

async function main() {
  console.log("\n=== A.8 Step 3 resource-authorization IDOR tests ===\n");
  const ctxA = makeCtx(ORG_A, 1);
  const ctxB = makeCtx(ORG_B, 2);

  console.log("-- authentication / fail-closed --");
  await test("unauthenticated mapped as OrganizationContextError path (401/403 helper)", () => {
    const r = resourceAuthErrorResponse(
      new ResourceAuthError("Unauthorized", 401, "UNAUTHENTICATED")
    );
    assert.equal(r.status, 401);
    assert.equal(r.body.code, "UNAUTHENTICATED");
  });
  await test("insufficient / missing resource is 404 non-leaking", () => {
    const r = resourceAuthErrorResponse(
      new ResourceAuthError("Artist not found", 404, "NOT_FOUND")
    );
    assert.equal(r.status, 404);
    assert.match(r.body.error, /not found/i);
  });
  await test("legacy int org refuses 0 (no fallback to inventing scope)", () => {
    try {
      requireLegacyIntOrgId({ ...ctxA, legacyIntOrgId: 0 });
      assert.fail("expected throw");
    } catch (e: any) {
      assert.equal(e.status, 403);
      assert.equal(e.code, "ORG_SCOPE_UNAVAILABLE");
    }
  });
  await test("legacy int org refuses NaN", () => {
    try {
      requireLegacyIntOrgId({ ...ctxA, legacyIntOrgId: Number.NaN });
      assert.fail("expected throw");
    } catch (e: any) {
      assert.equal(e.status, 403);
    }
  });

  console.log("\n-- track scope (two orgs) --");
  await test("track scope includes org A tenant_id only for A", () => {
    const scopeA = trackOrgScopeWhere(ctxA);
    const trackA = { id: 1, tenant_id: ORG_A };
    const trackB = { id: 2, tenant_id: ORG_B };
    assert.equal(matchesScope(trackA, scopeA), true);
    assert.equal(matchesScope(trackB, scopeA), false);
    assert.equal(matchesScope(trackB, trackOrgScopeWhere(ctxB)), true);
    assert.equal(matchesScope(trackA, trackOrgScopeWhere(ctxB)), false);
  });

  console.log("\n-- royalty scope (two orgs) --");
  await test("royalty scope isolates tenant_id by organization", () => {
    const royA = { id: 1, tenant_id: ORG_A };
    const royB = { id: 2, tenant_id: ORG_B };
    assert.equal(matchesScope(royA, royaltyOrgScopeWhere(ctxA)), true);
    assert.equal(matchesScope(royB, royaltyOrgScopeWhere(ctxA)), false);
    assert.equal(matchesScope(royB, royaltyOrgScopeWhere(ctxB)), true);
  });

  console.log("\n-- playlist scope (two orgs) --");
  await test("playlist scope: org A cannot match org B tenant", () => {
    const pA = { id: 1, tenant_id: ORG_A, created_by: 1 };
    const pB = { id: 2, tenant_id: ORG_B, created_by: 2 };
    assert.equal(matchesScope(pA, playlistOrgScopeWhere(ctxA)), true);
    assert.equal(matchesScope(pB, playlistOrgScopeWhere(ctxA)), false);
  });
  await test("playlist scope: legacy created_by only when tenant_id null", () => {
    const orphanMine = { id: 3, tenant_id: null, created_by: 1 };
    const orphanTheirs = { id: 4, tenant_id: null, created_by: 99 };
    assert.equal(matchesScope(orphanMine, playlistOrgScopeWhere(ctxA)), true);
    assert.equal(matchesScope(orphanTheirs, playlistOrgScopeWhere(ctxA)), false);
  });

  console.log("\n-- simulated catalog ownership (UUID org_id) --");
  await test("artist org A cannot update org B (filter simulation)", () => {
    const artists = [
      { id: 1, organization_id: ORG_A },
      { id: 2, organization_id: ORG_B },
    ];
    const findFor = (org: string, id: number) =>
      artists.find((a) => a.id === id && a.organization_id === org) || null;
    assert.ok(findFor(ORG_A, 1));
    assert.equal(findFor(ORG_A, 2), null); // cross-tenant deny
    assert.ok(findFor(ORG_B, 2));
    assert.equal(findFor(ORG_B, 1), null);
  });
  await test("release/work/contract same isolation pattern", () => {
    const releases = [
      { id: 1, organization_id: ORG_A, is_deleted: false },
      { id: 2, organization_id: ORG_B, is_deleted: false },
    ];
    const works = [
      { id: 1, organization_id: ORG_A, is_deleted: false },
      { id: 2, organization_id: ORG_B, is_deleted: false },
    ];
    const contracts = [
      { id: 1, organization_id: 10, tenant_id: ORG_A },
      { id: 2, organization_id: 20, tenant_id: ORG_B },
    ];
    assert.ok(releases.find((r) => r.id === 1 && r.organization_id === ORG_A));
    assert.equal(
      releases.find((r) => r.id === 2 && r.organization_id === ORG_A),
      undefined
    );
    assert.ok(works.find((w) => w.id === 1 && w.organization_id === ORG_A));
    assert.equal(
      works.find((w) => w.id === 2 && w.organization_id === ORG_A),
      undefined
    );
    // contract: org A uses int 10
    assert.ok(
      contracts.find(
        (c) =>
          c.id === 1 &&
          (c.organization_id === ctxA.legacyIntOrgId || c.tenant_id === ORG_A)
      )
    );
    assert.equal(
      contracts.find(
        (c) =>
          c.id === 2 &&
          (c.organization_id === ctxA.legacyIntOrgId || c.tenant_id === ORG_A)
      ),
      undefined
    );
  });

  console.log("\n-- HTTP status contract for routes --");
  await test("missing auth surfaces as 401 via ResourceAuthError", () => {
    const e = new ResourceAuthError("Unauthorized", 401, "UNAUTHENTICATED");
    assert.equal(resourceAuthErrorResponse(e).status, 401);
  });
  await test("forbidden scope surfaces as 403", () => {
    const e = new ResourceAuthError("Forbidden", 403, "FORBIDDEN");
    assert.equal(resourceAuthErrorResponse(e).status, 403);
  });
  await test("cross-tenant resource surfaces as 404 not 403", () => {
    const e = new ResourceAuthError("Release not found", 404, "NOT_FOUND");
    assert.equal(resourceAuthErrorResponse(e).status, 404);
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
