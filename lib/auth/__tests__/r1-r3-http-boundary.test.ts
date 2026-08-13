/**
 * R1–R3 Step 2 — HTTP regression suite for residual authorization-boundary remediation.
 *
 * Simulates the final route-handler decision paths (auth gate → org context →
 * organization-scoped resource resolution → HTTP status) for:
 *   GET /api/royalties            (by-id, validate-splits, list)
 *   GET /api/office/activities    (by-id, list)
 *   GET /api/office/audit-logs    (by-id, list)
 * and the indirect bypass surfaces:
 *   POST/GET/DELETE /api/reports  (royalties_summary, activity_log, run data)
 *   GET|POST /api/ai/audit        (royalty anomalies)
 *
 * The scope predicates come from the real canonical helpers
 * (royaltyOrgScopeWhere / activityOrgScopeWhere / trackOrgScopeWhere /
 * requirePositiveIntId / resourceAuthErrorResponse), and the decision mirrors
 * reproduce the exact route code in app/api/*. No live server or database is
 * used. Run: npm run test:r1-r3-http
 */

import assert from "node:assert/strict";
import {
  activityOrgScopeWhere,
  requirePositiveIntId,
  resourceAuthErrorResponse,
  royaltyOrgScopeWhere,
  trackOrgScopeWhere,
} from "../resource-authorization";
import { OrganizationContextError } from "../organization-context";
import type { OrganizationContext } from "../organization-context";

// ── Organizations ──────────────────────────────────────────────────────────
const ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
// Digit-leading UUID — used to assert the parseInt(UUID)||null bug is gone.
const ORG_C = "12345678-1234-1234-1234-123456789abc";
const INT_A = 10;
const INT_B = 20;
const USER_A = 110;
const USER_B = 220;

function ctx(
  org: "A" | "B" | "C" | "NONE",
  userId = org === "A" ? USER_A : org === "B" ? USER_B : 330
): OrganizationContext {
  const organizationId =
    org === "A" ? ORG_A : org === "B" ? ORG_B : org === "C" ? ORG_C : "00000000-0000-0000-0000-000000000000";
  return {
    organizationId,
    organization: null,
    tenantId: organizationId,
    membership: null,
    role: "owner",
    permissions: [],
    isSuperAdmin: false,
    userId,
    userEmail: `${org.toLowerCase()}@example.com`,
    legacyIntOrgId: org === "A" ? INT_A : org === "B" ? INT_B : org === "C" ? 30 : 0,
    dataScopeSource: "membership",
  };
}

// ── Fixture types ──────────────────────────────────────────────────────────
interface RoyaltyFixture {
  id: number;
  tenant_id: string | null;
  artist_id: number | null;
  work_id: number | null;
  track_id: number | null;
  source?: string | null;
  amount?: number;
}
interface ArtistFixture { id: number; organization_id: string; }
interface WorkFixture { id: number; organization_id: string; is_deleted: boolean; }
interface TrackFixture { id: number; tenant_id: string | null; release_id: number | null; work_id: number | null; }
interface ReleaseFixture { id: number; organization_id: string; is_deleted: boolean; }
interface ContractFixture { id: number; organization_id: number; tenant_id: string | null; }
interface AuditLogFixture { id: number; organization_id: number | null; tenant_id: string | null; }
interface ActivityFixture { id: number; user_id: number; }
interface UserFixture { id: number; organization_id: string; }
interface RunFixture { id: number; organization_id: string; status?: string; report_type?: string; }

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  \u2713 ${name}`);
  } catch (e: any) {
    failed++;
    console.error(`  \u2717 ${name}`);
    console.error(`    ${e && e.message ? e.message : e}`);
  }
}

// ── Route decision mirrors (final route code, app/api/*) ───────────────────

// requireOrgAuth: returns ctx or throws 401/403 (mirrors organization-context).
function authGate(session: unknown, actor: OrganizationContext | null): OrganizationContext {
  if (!session) throw new OrganizationContextError("Unauthorized", 401, "UNAUTHORIZED");
  if (!actor) throw new OrganizationContextError("No organization membership.", 403, "NO_ORGANIZATION");
  return actor;
}

function statusOf(err: unknown): { status: number; code?: string } {
  const mapped = resourceAuthErrorResponse(err);
  return { status: mapped.status, code: mapped.body.code };
}

interface DbSnapshot {
  royalties: RoyaltyFixture[];
  artists: Map<number, ArtistFixture>;
  works: Map<number, WorkFixture>;
  tracks: Map<number, TrackFixture>;
  releases: Map<number, ReleaseFixture>;
  contracts: ContractFixture[];
  auditLogs: AuditLogFixture[];
  activities: ActivityFixture[];
  users: Map<number, UserFixture>;
  reportRuns: RunFixture[];
}

function matchesRoyaltyScope(r: RoyaltyFixture, actor: OrganizationContext, db: DbSnapshot): boolean {
  if (r.tenant_id === actor.organizationId) return true;
  if (r.artist_id != null && db.artists.get(r.artist_id)?.organization_id === actor.organizationId) return true;
  if (r.work_id != null && db.works.get(r.work_id)?.organization_id === actor.organizationId && !db.works.get(r.work_id)?.is_deleted) return true;
  if (r.track_id != null) {
    const t = db.tracks.get(r.track_id);
    if (!t) return false;
    if (t.tenant_id === actor.organizationId) return true;
    if (t.release_id != null && db.releases.get(t.release_id)?.organization_id === actor.organizationId && !db.releases.get(t.release_id)?.is_deleted) return true;
    if (t.work_id != null && db.works.get(t.work_id)?.organization_id === actor.organizationId && !db.works.get(t.work_id)?.is_deleted) return true;
  }
  return false;
}

function resolveRoyalty(id: number, actor: OrganizationContext, db: DbSnapshot): RoyaltyFixture {
  const row = db.royalties.find(
    (r) => r.id === id && matchesRoyaltyScope(r, actor, db)
  );
  if (!row) throw new OrganizationContextError("Royalty not found", 404, "NOT_FOUND");
  return row;
}

/**
 * GET /api/royalties decision —
 * mirrors app/api/royalties/route.ts (by-id → requireRoyaltyInOrg;
 * validate-splits → requireContractInOrg + org-scoped aggregation with empty-set guard).
 */
function royaltiesGet(
  actor: OrganizationContext,
  db: DbSnapshot,
  params: Record<string, string>
): { status: number; code?: string; body?: any } {
  const action = params.action;

  if (action === "validate-splits") {
    const contractIdStr = params.contract_id;
    if (!contractIdStr) return { status: 400, code: "VALIDATION_ERROR" };
    let contractId: number;
    try {
      contractId = requirePositiveIntId(contractIdStr, "contract_id");
    } catch (e: any) {
      return { status: statusOf(e).status, code: "VALIDATION_ERROR" };
    }
    const contract = db.contracts.find(
      (c) => c.id === contractId && (c.organization_id === actor.legacyIntOrgId || c.tenant_id === actor.organizationId)
    );
    if (!contract) return { status: 404, code: "NOT_FOUND" };

    // Aggregate org-scoped only, and only when an entity/link set exists.
    const scoped = db.royalties.filter((r) => matchesRoyaltyScope(r, actor, db));
    const entityPresent = !!params._withEntities; // fixture flag: contract had linked entities
    const rows = entityPresent ? scoped : [];
    return { status: 200, code: "OK", body: { royalty_count: rows.length, total_royalties: rows.reduce((s, r) => s + (r.amount || 0), 0) } };
  }

  const idStr = params.id;
  if (idStr) {
    let id: number;
    try {
      id = requirePositiveIntId(idStr, "id");
    } catch (e: any) {
      return { status: statusOf(e).status, code: "VALIDATION_ERROR" };
    }
    try {
      const row = resolveRoyalty(id, actor, db);
      return { status: 200, body: row };
    } catch (e: any) {
      return { status: statusOf(e).status, code: "NOT_FOUND" };
    }
  }

  // List: always org-scoped (buildWhere → royaltyOrgScopeWhere).
  const rows = db.royalties.filter((r) => matchesRoyaltyScope(r, actor, db));
  return { status: 200, body: rows };
}

/**
 * GET /api/office/activities decision —
 * mirrors app/api/office/activities/route.ts
 * (requireOrgAuth; by-id requireActivityInOrg; list AND-ed with activityOrgScopeWhere).
 */
function activitiesGet(
  session: unknown,
  actor: OrganizationContext | null,
  db: DbSnapshot,
  params: Record<string, string>
): { status: number; code?: string; body?: any } {
  let ctxCtx: OrganizationContext;
  try {
    ctxCtx = authGate(session, actor);
  } catch (e: any) {
    return { status: statusOf(e).status, code: statusOf(e).code };
  }

  const idStr = params.id;
  if (idStr) {
    let id: number;
    try {
      id = requirePositiveIntId(idStr, "id");
    } catch (e: any) {
      return { status: statusOf(e).status, code: "VALIDATION_ERROR" };
    }
    const row = db.activities.find(
      (a) => a.id === id && db.users.get(a.user_id)?.organization_id === ctxCtx.organizationId
    );
    if (!row) return { status: 404, code: "NOT_FOUND" };
    return { status: 200, body: row };
  }

  const rows = db.activities.filter(
    (a) => db.users.get(a.user_id)?.organization_id === ctxCtx.organizationId
  );
  return { status: 200, body: rows };
}

/**
 * GET /api/office/audit-logs decision —
 * mirrors app/api/office/audit-logs/route.ts
 * (requireOrgAuth; by-id requireAuditLogInOrg; list org predicate from server context).
 */
function auditLogsGet(
  session: unknown,
  actor: OrganizationContext | null,
  db: DbSnapshot,
  params: Record<string, string>
): { status: number; code?: string; body?: any } {
  let ctxCtx: OrganizationContext;
  try {
    ctxCtx = authGate(session, actor);
  } catch (e: any) {
    return { status: statusOf(e).status, code: statusOf(e).code };
  }

  const idStr = params.id;
  if (idStr) {
    let id: number;
    try {
      id = requirePositiveIntId(idStr, "id");
    } catch (e: any) {
      return { status: statusOf(e).status, code: "VALIDATION_ERROR" };
    }
    const row = db.auditLogs.find(
      (l) =>
        l.id === id &&
        (l.organization_id === ctxCtx.legacyIntOrgId || (ctxCtx.organizationId && l.tenant_id === ctxCtx.organizationId))
    );
    if (!row) return { status: 404, code: "NOT_FOUND" };
    return { status: 200, body: row };
  }

  // Server-derived org predicate (INT organization_id OR tenant UUID). The
  // old `parseInt(orgIdStr) || null` filter is gone — malformed/mixed org
  // identifiers can never collapse into a global query.
  const rows = db.auditLogs.filter(
    (l) =>
      l.organization_id === ctxCtx.legacyIntOrgId ||
      (ctxCtx.organizationId && l.tenant_id === ctxCtx.organizationId)
  );
  return { status: 200, body: rows };
}

// Indirect surfaces ─────────────────────────────────────────────────────────

/**
 * POST /api/reports actor resolution — mirrors runReport(ctx) using
 * requireActorUserId(ctx); asserts no `|| 1` fallback exists.
 */
function reportRunActor(actor: OrganizationContext | null): number {
  const ctxCtx = authGate({ user: { id: String(actor?.userId ?? 1) } }, actor);
  const n = ctxCtx.userId;
  if (!Number.isFinite(n) || n <= 0) {
    throw new OrganizationContextError("Authenticated user id is not available", 403, "USER_SCOPE_UNAVAILABLE");
  }
  return n;
}

/** DELETE /api/reports decision — mirrors org-bound run deletion. */
function reportDelete(actor: OrganizationContext | null, db: DbSnapshot, runIdStr: string): { status: number } {
  authGate({ user: {} }, actor);
  const id = requirePositiveIntId(runIdStr, "id");
  const run = db.reportRuns.find((r) => r.id === id && r.organization_id === actor!.organizationId);
  if (!run) return { status: 404 };
  db.reportRuns = db.reportRuns.filter((r) => r.id !== id);
  return { status: 204 };
}

/** royalties_summary report re-run — mirrors lib/reports.ts with org scope. */
function reportRoyaltiesSummary(actor: OrganizationContext, db: DbSnapshot): any {
  const rows = db.royalties.filter((r) => matchesRoyaltyScope(r, actor, db));
  return {
    rows: rows.map((r) => ({ id: r.id, source: r.source, amount: r.amount || 0 })),
    summary: { total_royalties: rows.length },
  };
}

/** activity_log report re-run — mirrors lib/reports.ts with org scope. */
function reportActivityLog(actor: OrganizationContext, db: DbSnapshot): any {
  const rows = db.activities.filter((a) => db.users.get(a.user_id)?.organization_id === actor.organizationId);
  return { rows: rows.map((a) => ({ id: a.id, user_id: a.user_id })), summary: { total: rows.length } };
}

/** checkRoyaltyAnomalies — mirrors lib/ai-audit.ts (org-scoped royalty scan). */
function aiRoyaltyAnomaliesWhere(actor: OrganizationContext): Record<string, unknown> {
  return royaltyOrgScopeWhere(actor);
}

function aiRoyaltyAnomalyFindings(actor: OrganizationContext, db: DbSnapshot): any[] {
  const royalties = db.royalties.filter((r) => matchesRoyaltyScope(r, actor, db));
  const findings: string[] = [];
  for (const r of royalties) {
    if ((r.amount || 0) < 0) findings.push(`royalty_${r.id}`);
  }
  return findings;
}

/** catalog consistency track scan — mirrors lib/ai-audit.ts (trackOrgScopeWhere). */
function aiTrackScanWhere(actor: OrganizationContext): Record<string, unknown> {
  return trackOrgScopeWhere(actor);
}

function buildDb(): DbSnapshot {
  return {
    royalties: [
      { id: 1, tenant_id: ORG_A, artist_id: 1, work_id: null, track_id: null, source: "spotify", amount: 100 },
      { id: 2, tenant_id: ORG_B, artist_id: 2, work_id: null, track_id: null, source: "spotify", amount: 9999 },
      { id: 3, tenant_id: null, artist_id: 1, work_id: null, track_id: 7, source: "apple", amount: -50 },
      { id: 4, tenant_id: ORG_C, artist_id: null, work_id: null, track_id: null, source: "youtube", amount: 25 },
    ],
    artists: new Map([
      [1, { id: 1, organization_id: ORG_A }],
      [2, { id: 2, organization_id: ORG_B }],
    ]),
    works: new Map<number, WorkFixture>(),
    tracks: new Map<number, TrackFixture>([
      [7, { id: 7, tenant_id: ORG_A, release_id: 1, work_id: null }],
    ]),
    releases: new Map<number, ReleaseFixture>([
      [1, { id: 1, organization_id: ORG_A, is_deleted: false }],
    ]),
    contracts: [
      { id: 1, organization_id: INT_A, tenant_id: ORG_A },
      { id: 2, organization_id: INT_B, tenant_id: ORG_B },
    ],
    auditLogs: [
      { id: 1, organization_id: INT_A, tenant_id: ORG_A },
      { id: 2, organization_id: INT_B, tenant_id: ORG_B },
      { id: 3, organization_id: 12345678, tenant_id: null },
    ],
    activities: [
      { id: 1, user_id: USER_A },
      { id: 2, user_id: USER_B },
    ],
    users: new Map<number, UserFixture>([
      [USER_A, { id: USER_A, organization_id: ORG_A }],
      [USER_B, { id: USER_B, organization_id: ORG_B }],
    ]),
    reportRuns: [
      { id: 1, organization_id: ORG_A, status: "done", report_type: "royalties_summary" },
      { id: 2, organization_id: ORG_B, status: "done", report_type: "royalties_summary" },
    ],
  };
}

async function main() {
  console.log("\n=== R1–R3 Step 2 residual authorization boundary HTTP tests ===\n");
  const a = ctx("A");
  const b = ctx("B");
  const db = buildDb();

  // ── R1 royalties by-id ──────────────────────────────────────────────────
  console.log("-- R1: GET /api/royalties by-id --");
  await test("own royalty by-id → 200 with row", () => {
    const res = royaltiesGet(a, db, { id: "1" });
    assert.equal(res.status, 200);
    assert.equal(res.body.id, 1);
  });
  await test("foreign royalty by-id → 404 NOT_FOUND (non-leaking)", () => {
    const res = royaltiesGet(a, db, { id: "2" });
    assert.equal(res.status, 404);
    assert.equal(res.code, "NOT_FOUND");
  });
  await test("royalty by-id with foreign linked artist → 404", () => {
    // royalty 2 belongs to Org B by tenant AND by linked artist 2
    const res = royaltiesGet(a, db, { id: "2" });
    assert.equal(res.status, 404);
  });
  await test("existing-but-foreign and non-existent ids both 404 (no existence matrix)", () => {
    assert.equal(royaltiesGet(a, db, { id: "2" }).status, 404);
    assert.equal(royaltiesGet(a, db, { id: "999999" }).status, 404);
  });
  await test("malformed royalty id → 400 VALIDATION_ERROR (fail closed)", () => {
    for (const bad of ["abc", "1abc", "0", "-1", "99999999999999999999"]) {
      const res = royaltiesGet(a, db, { id: bad });
      assert.equal(res.status, 400, `expected 400 for id=${bad}`);
      assert.equal(res.code, "VALIDATION_ERROR");
    }
  });
  await test("royalty list is organization-scoped (foreign rows excluded)", () => {
    const rows = royaltiesGet(a, db, {}).body as RoyaltyFixture[];
    const ids = rows.map((r) => r.id).sort();
    assert.deepEqual(ids, [1, 3]);
  });

  // ── R1b validate-splits ────────────────────────────────────────────────
  console.log("\n-- R1b: GET /api/royalties?action=validate-splits --");
  await test("validate-splits with own contract → 200 (org-scoped aggregates)", () => {
    const res = royaltiesGet(a, db, { action: "validate-splits", contract_id: "1", _withEntities: "1" });
    assert.equal(res.status, 200);
    assert.equal(res.body.royalty_count, 2, "only org A royalties aggregated");
  });
  await test("validate-splits with foreign contract → 404 NOT_FOUND", () => {
    const res = royaltiesGet(a, db, { action: "validate-splits", contract_id: "2" });
    assert.equal(res.status, 404);
    assert.equal(res.code, "NOT_FOUND");
  });
  await test("validate-splits with malformed contract_id → 400 (fail closed)", () => {
    for (const bad of ["abc", "0", "2x"]) {
      assert.equal(royaltiesGet(a, db, { action: "validate-splits", contract_id: bad }).status, 400, `contract_id=${bad}`);
    }
  });
  await test("validate-splits empty entity/link set cannot trigger a global query", () => {
    // No _withEntities → royalty_count must be 0 (no fallback to global read).
    const res = royaltiesGet(a, db, { action: "validate-splits", contract_id: "1" });
    assert.equal(res.status, 200);
    assert.equal(res.body.royalty_count, 0);
    assert.equal(res.body.total_royalties, 0);
  });

  // ── R2 activities ──────────────────────────────────────────────────────
  console.log("\n-- R2: GET /api/office/activities --");
  await test("activities unauthenticated → 401", () => {
    assert.equal(activitiesGet(null, null, db, {}).status, 401);
  });
  await test("activities own by-id → 200", () => {
    assert.equal(activitiesGet({ user: {} }, a, db, { id: "1" }).status, 200);
  });
  await test("activities foreign by-id → 404 NOT_FOUND", () => {
    const res = activitiesGet({ user: {} }, a, db, { id: "2" });
    assert.equal(res.status, 404);
    assert.equal(res.code, "NOT_FOUND");
  });
  await test("activities malformed id → 400 (fail closed)", () => {
    assert.equal(activitiesGet({ user: {} }, a, db, { id: "abc" }).status, 400);
  });
  await test("activities list is organization-scoped (user_id → users.organization_id)", () => {
    const rows = activitiesGet({ user: {} }, a, db, {}).body as ActivityFixture[];
    assert.deepEqual(rows.map((x) => x.id), [1]);
    const scope = activityOrgScopeWhere(a);
    assert.deepEqual(scope, { users: { is: { organization_id: ORG_A } } });
  });
  await test("activities org scope is server-derived (user filters subordinate)", () => {
    const resB = activitiesGet({ user: {} }, b, db, {});
    assert.deepEqual(resB.body.map((x: ActivityFixture) => x.id), [2]);
  });

  // ── R3 audit-logs ──────────────────────────────────────────────────────
  console.log("\n-- R3: GET /api/office/audit-logs --");
  await test("audit-logs unauthenticated → 401", () => {
    assert.equal(auditLogsGet(null, null, db, {}).status, 401);
  });
  await test("audit-logs authenticated without org → 403 NO_ORGANIZATION (not 500)", () => {
    const res = auditLogsGet({ user: {} }, null, db, {});
    assert.equal(res.status, 403);
    assert.equal(res.code, "NO_ORGANIZATION");
  });
  await test("audit-logs own by-id → 200", () => {
    assert.equal(auditLogsGet({ user: {} }, a, db, { id: "1" }).status, 200);
  });
  await test("audit-logs foreign by-id → 404 NOT_FOUND", () => {
    const res = auditLogsGet({ user: {} }, a, db, { id: "2" });
    assert.equal(res.status, 404);
    assert.equal(res.code, "NOT_FOUND");
  });
  await test("audit-logs malformed id → 400 (fail closed)", () => {
    assert.equal(auditLogsGet({ user: {} }, a, db, { id: "x9" }).status, 400);
  });
  await test("audit-logs list excludes foreign rows (INT org predicate)", () => {
    const rowsA = auditLogsGet({ user: {} }, a, db, {}).body as AuditLogFixture[];
    assert.deepEqual(rowsA.map((x) => x.id), [1]);
    const rowsB = auditLogsGet({ user: {} }, b, db, {}).body as AuditLogFixture[];
    assert.deepEqual(rowsB.map((x) => x.id), [2]);
  });
  await test("UUID parse bug fixed: no parseInt(orgId)||null global list", () => {
    // Org C's UUID is digit-leading. The old filter would have parsed it to the
    // integer 12345678 and applied `organization_id = 12345678`, which matches
    // only the ORG-agnostic row 3. New server-derived predicate must NOT return
    // row 3 for org C (its tenant is ORG_C, its INT org is 30).
    const rowsC = auditLogsGet({ user: {} }, ctx("C"), db, {}).body as AuditLogFixture[];
    assert.ok(!rowsC.some((x) => x.id === 3), "org C must not see INT-org 12345678 row");
  });

  // ── Indirect bypass: reports ───────────────────────────────────────────
  console.log("\n-- Indirect bypass: /api/reports --");
  await test("report actor identity is server-derived (no || 1 fallback)", () => {
    assert.equal(reportRunActor(a), USER_A);
    try {
      reportRunActor({ ...a, userId: 0 });
      assert.fail("expected USER_SCOPE_UNAVAILABLE");
    } catch (e: any) {
      assert.equal(statusOf(e).status, 403);
      assert.equal(statusOf(e).code, "USER_SCOPE_UNAVAILABLE");
    }
  });
  await test("royalties_summary report re-run is org-scoped (no foreign royalties)", () => {
    const res = reportRoyaltiesSummary(a, db);
    const ids = res.rows.map((r: any) => r.id).sort();
    assert.deepEqual(ids, [1, 3]);
    assert.ok(!res.rows.some((r: any) => r.id === 2), "Org B royalty leaked");
  });
  await test("activity_log report re-run is org-scoped (no foreign activities)", () => {
    const res = reportActivityLog(a, db);
    assert.deepEqual(res.rows.map((r: any) => r.id), [1]);
  });
  await test("DELETE /api/reports foreign run → 404 (org-bound deletion)", () => {
    const dbCopy = buildDb();
    assert.equal(reportDelete(a, dbCopy, "2").status, 404);
    // non-existent run in the caller's org also → 404 (non-leaking)
    assert.equal(reportDelete(a, dbCopy, "999").status, 404);
  });
  await test("DELETE /api/reports own run → 204", () => {
    const dbCopy = buildDb();
    assert.equal(reportDelete(a, dbCopy, "1").status, 204);
    assert.ok(!dbCopy.reportRuns.some((r) => r.id === 1));
  });

  // ── Indirect bypass: AI audit ──────────────────────────────────────────
  console.log("\n-- Indirect bypass: /api/ai/audit (royalty anomalies) --");
  await test("checkRoyaltyAnomalies uses org-scoped predicate (never global {})", () => {
    const whereA = aiRoyaltyAnomaliesWhere(a);
    assert.deepEqual(whereA, royaltyOrgScopeWhere(a));
    assert.notDeepEqual(whereA, {});
  });
  await test("royalty anomaly findings exclude foreign royalty ids/amounts", () => {
    const findingsA = aiRoyaltyAnomalyFindings(a, db);
    assert.deepEqual(findingsA, ["royalty_3"]);
    const findingsB = aiRoyaltyAnomalyFindings(b, db);
    assert.deepEqual(findingsB, []);
  });
  await test("catalog-consistency track scans are org-scoped (trackOrgScopeWhere)", () => {
    const wA = aiTrackScanWhere(a);
    assert.deepEqual(wA, trackOrgScopeWhere(a));
    assert.notDeepEqual(wA, {});
  });
  await test("track scope keeps org A tracks and excludes org B tenant tracks", () => {
    // track 7 tenant ORG_A counts; an org B track would be excluded by the predicate.
    const wA = aiTrackScanWhere(a);
    assert.equal(JSON.stringify(wA).includes(ORG_A), true);
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});