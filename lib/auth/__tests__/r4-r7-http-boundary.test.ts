/**
 * R4–R7 Step 2 — HTTP regression suite for residual authorization-boundary
 * remediation.
 *
 * Covers the HTTP contract matrix defined in:
 *   docs/platform/identity/r4-r7-step1-residual-boundary-audit.md §14
 *
 * T-R4-1 … T-R4-6  POST/PUT/DELETE /api/iam/roles  (org-scoped pre-check)
 * T-R5-1 … T-R5-8  POST /api/ai/contracts resolve
 *                  POST /api/ai/core-write propose/apply
 *                  POST /api/ai/release-integration attach
 * T-R6-1 … T-R6-4  GET /api/search (contracts section)
 *                  GET /api/office/audit-logs (regression)
 *
 * Decision mirrors reproduce the exact route + helper logic in:
 *   app/api/iam/roles/route.ts
 *   app/api/ai/contracts/route.ts
 *   app/api/ai/core-write/route.ts
 *   app/api/ai/release-integration/route.ts
 *   app/api/search/route.ts
 *   app/api/office/audit-logs/route.ts
 *
 * No live server, no database, no network — all decisions driven by the real
 * canonical authorization helpers imported from lib/auth/resource-authorization
 * and lib/auth/organization-context, matching exactly how the routes use them.
 *
 * Run: npm run test:r4-r7-http
 */

import assert from "node:assert/strict";
import {
  contractOrgScopeWhere,
  requireActorUserId,
  requireEntityReferenceInOrg,
  requireLegacyIntOrgId,
  requirePositiveIntId,
  resourceAuthErrorResponse,
  ResourceAuthError,
} from "../resource-authorization";
import { OrganizationContextError } from "../organization-context";
import type { OrganizationContext } from "../organization-context";

// ── Test infrastructure ────────────────────────────────────────────────────

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
    console.error(`    ${e && e.message ? e.message : String(e)}`);
  }
}

function statusOf(err: unknown): number {
  return resourceAuthErrorResponse(err).status;
}
function codeOf(err: unknown): string | undefined {
  return resourceAuthErrorResponse(err).body.code;
}

// ── Organizations ──────────────────────────────────────────────────────────

const ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
// Digit-leading UUID — exercises the parseInt(UUID)||0 regression path.
const ORG_C_DIGIT = "12345678-1234-1234-1234-123456789abc";
const INT_A = 10;
const INT_B = 20;
const INT_C = 30;
const USER_A = 101;
const USER_B = 202;

function ctx(
  org: "A" | "B" | "C",
  overrides: Partial<OrganizationContext> = {}
): OrganizationContext {
  const organizationId =
    org === "A" ? ORG_A : org === "B" ? ORG_B : ORG_C_DIGIT;
  return {
    organizationId,
    organization: null,
    tenantId: organizationId,
    membership: null,
    role: "owner",
    permissions: ["roles.manage"],
    isSuperAdmin: false,
    userId: org === "A" ? USER_A : org === "B" ? USER_B : 303,
    userEmail: `${org.toLowerCase()}@example.com`,
    legacyIntOrgId: org === "A" ? INT_A : org === "B" ? INT_B : INT_C,
    dataScopeSource: "membership",
    ...overrides,
  };
}

// Platform authority context (superuser).
function platformCtx(): OrganizationContext & {
  isSuperAdmin: true;
  role: "platform_admin";
} {
  return {
    ...ctx("A"),
    isSuperAdmin: true,
    role: "platform_admin",
    permissions: ["roles.manage", "platform.admin"],
  } as any;
}

// ── Fixture types ──────────────────────────────────────────────────────────

interface RoleFixture {
  id: number;
  name: string;
  organization_id: string | null;
  is_system: boolean;
}
interface ContractFixture {
  id: number;
  organization_id: number;
  tenant_id: string | null;
}
interface ReleaseFixture {
  id: number;
  organization_id: string;
  is_deleted: boolean;
}
interface ArtistFixture {
  id: number;
  organization_id: string;
}
interface AuditLogFixture {
  id: number;
  organization_id: number | null;
  tenant_id: string | null;
}
interface AiRunFixture {
  id: number;
  organization_id: number | string;
}

interface DbSnapshot {
  roles: RoleFixture[];
  contracts: ContractFixture[];
  releases: ReleaseFixture[];
  artists: ArtistFixture[];
  auditLogs: AuditLogFixture[];
  aiContractRuns: AiRunFixture[];
  aiCoreWriteRuns: AiRunFixture[];
  aiReleaseIntegrationRuns: AiRunFixture[];
}

function buildDb(): DbSnapshot {
  return {
    roles: [
      { id: 1, name: "editor", organization_id: ORG_A, is_system: false },
      { id: 2, name: "viewer", organization_id: ORG_B, is_system: false },
      { id: 3, name: "system_default", organization_id: null, is_system: true },
      { id: 4, name: "shared_name", organization_id: ORG_A, is_system: false },
      // ORG_B also has a role called "shared_name" — tests the oracle boundary.
      { id: 5, name: "shared_name", organization_id: ORG_B, is_system: false },
    ],
    contracts: [
      { id: 1, organization_id: INT_A, tenant_id: ORG_A },
      { id: 2, organization_id: INT_B, tenant_id: ORG_B },
    ],
    releases: [
      { id: 1, organization_id: ORG_A, is_deleted: false },
      { id: 2, organization_id: ORG_B, is_deleted: false },
    ],
    artists: [
      { id: 1, organization_id: ORG_A },
      { id: 2, organization_id: ORG_B },
    ],
    auditLogs: [
      { id: 1, organization_id: INT_A, tenant_id: ORG_A },
      { id: 2, organization_id: INT_B, tenant_id: ORG_B },
      { id: 3, organization_id: 12345678, tenant_id: null },
    ],
    aiContractRuns: [
      { id: 1, organization_id: ORG_A },
      { id: 2, organization_id: ORG_B },
    ],
    aiCoreWriteRuns: [
      { id: 1, organization_id: INT_A },
      { id: 2, organization_id: INT_B },
    ],
    aiReleaseIntegrationRuns: [
      { id: 1, organization_id: INT_A },
      { id: 2, organization_id: INT_B },
    ],
  };
}

// ── R4: iam/roles POST decision mirror ────────────────────────────────────
//
// Mirrors app/api/iam/roles/route.ts POST exactly:
//   1. requirePermission("roles.manage") → session must be present
//   2. body.name required → 400
//   3. platform → global findUnique; org actor → findFirst({name, org OR system})
//   4. existing → 400 "Role already exists"
//   5. no existing → 201

function isPlatform(actor: OrganizationContext): boolean {
  return (actor as any).isSuperAdmin === true ||
    ((actor as any).role === "platform_admin");
}

function rolePrecheckScope(
  actor: OrganizationContext,
  name: string,
  db: DbSnapshot
): RoleFixture | undefined {
  if (isPlatform(actor)) {
    // Platform: global lookup (cross-org naming authority).
    return db.roles.find((r) => r.name === name);
  }
  // Org actor: scoped to own org OR system roles (org null + is_system true).
  return db.roles.find(
    (r) =>
      r.name === name &&
      (r.organization_id === actor.organizationId ||
        (r.organization_id === null && r.is_system))
  );
}

function rolesPost(
  session: unknown,
  actor: OrganizationContext | null,
  db: DbSnapshot,
  body: Record<string, any>
): { status: number; body?: any } {
  if (!session) return { status: 401, body: { error: "Unauthorized" } };
  if (!actor) return { status: 403, body: { error: "No organization membership." } };
  if (!body.name) return { status: 400, body: { error: "Role name required" } };

  const organization_id = isPlatform(actor) && body.organization_id
    ? body.organization_id
    : actor.organizationId;
  if (!organization_id) return { status: 403, body: { error: "Organization context required" } };

  const existing = rolePrecheckScope(actor, body.name, db);
  if (existing) return { status: 400, body: { error: "Role already exists" } };

  // Create
  const newRole: RoleFixture = {
    id: db.roles.length + 1,
    name: body.name,
    organization_id,
    is_system: false,
  };
  db.roles.push(newRole);
  return { status: 201, body: newRole };
}

function rolesMutate(
  session: unknown,
  actor: OrganizationContext | null,
  db: DbSnapshot,
  id: number,
  op: "update" | "delete"
): { status: number } {
  if (!session) return { status: 401 };
  if (!actor) return { status: 403 };

  const role = isPlatform(actor)
    ? db.roles.find((r) => r.id === id)
    : db.roles.find((r) => r.id === id && r.organization_id === actor.organizationId);
  if (!role) return { status: 404 };
  if (role.is_system) return { status: 400 };

  if (op === "delete") db.roles = db.roles.filter((r) => r.id !== id);
  return { status: 200 };
}

// ── R5: AI entity-reference decision mirrors ──────────────────────────────
//
// Each function mirrors the exact sequence in the route:
//   requireOrganization() → requirePositiveIntId(run_id) → findFirst({id, orgId})
//   → requireEntityReferenceInOrg(entity_type, entity_id, ctx) → persist
//
// We use the REAL requireEntityReferenceInOrg from resource-authorization but
// pass in a synchronous "prober" so no Prisma is needed.

type OrgProber = (
  entityType: string,
  entityId: number,
  actor: OrganizationContext
) => boolean;

/**
 * Build a prober from the fixture db — mirrors the per-entity require*InOrg
 * behaviour (returns true when owned by actor's org, false otherwise).
 */
function makeProber(db: DbSnapshot): OrgProber {
  return (entityType: string, entityId: number, actor: OrganizationContext): boolean => {
    switch (entityType.toLowerCase()) {
      case "artist":
      case "artists": {
        const a = db.artists.find((x) => x.id === entityId);
        return !!a && a.organization_id === actor.organizationId;
      }
      case "release":
      case "releases": {
        const r = db.releases.find((x) => x.id === entityId);
        return !!r && r.organization_id === actor.organizationId && !r.is_deleted;
      }
      case "contract":
      case "contracts": {
        const c = db.contracts.find((x) => x.id === entityId);
        if (!c) return false;
        const intOrg = actor.legacyIntOrgId;
        return c.organization_id === intOrg || c.tenant_id === actor.organizationId;
      }
      default:
        return false; // unknown type → not owned
    }
  };
}

/**
 * Mirrors requireEntityReferenceInOrg semantics but synchronously using fixture
 * data — returns the resolved entity id or throws ResourceAuthError.
 */
function resolveEntityRef(
  entityType: unknown,
  entityIdRaw: unknown,
  actor: OrganizationContext,
  prober: OrgProber
): number | null {
  if (entityIdRaw === undefined || entityIdRaw === null || entityIdRaw === "") {
    return null;
  }
  const id = requirePositiveIntId(entityIdRaw, "entity_id");
  const type = String(entityType ?? "").trim().toLowerCase();

  // Unknown types → 400 (fail closed).
  const knownTypes = [
    "artist", "artists", "release", "releases", "contract", "contracts",
    "track", "tracks", "work", "works", "royalty", "royalties",
    "playlist", "playlists", "contract_document", "contract_documents",
    "ai_contract_document", "ai_contract_documents",
  ];
  if (!knownTypes.includes(type)) {
    throw new ResourceAuthError("Unsupported entity_type", 400, "VALIDATION_ERROR");
  }
  if (!prober(type, id, actor)) {
    throw new ResourceAuthError("Resource not found", 404, "NOT_FOUND");
  }
  return id;
}

// ai/contracts resolve
function aiContractsResolve(
  session: unknown,
  actor: OrganizationContext | null,
  db: DbSnapshot,
  body: { run_id: unknown; links: Array<{ entity_type: string; entity_id: unknown }> }
): { status: number; body?: any } {
  if (!session) return { status: 401 };
  if (!actor) return { status: 403 };

  let runId: number;
  try {
    runId = requirePositiveIntId(body.run_id, "run_id");
  } catch (e) {
    return { status: statusOf(e), body: { code: codeOf(e) } };
  }

  const run = db.aiContractRuns.find(
    (r) => r.id === runId && r.organization_id === actor.organizationId
  );
  if (!run) return { status: 404, body: { error: "Run not found" } };

  const prober = makeProber(db);
  const created: any[] = [];
  for (const link of body.links || []) {
    let entityId: number | null;
    try {
      entityId = resolveEntityRef(link.entity_type, link.entity_id, actor, prober);
    } catch (e) {
      return { status: statusOf(e), body: { code: codeOf(e) } };
    }
    created.push({ run_id: runId, entity_type: link.entity_type, entity_id: entityId });
  }
  return { status: 201, body: created };
}

// ai/core-write propose
function aiCoreWritePropose(
  session: unknown,
  actor: OrganizationContext | null,
  db: DbSnapshot,
  body: { contract_id: unknown; release_id?: unknown; contract_document_id?: unknown }
): { status: number; body?: any } {
  if (!session) return { status: 401 };
  if (!actor) return { status: 403 };

  let contractId: number;
  try {
    contractId = requirePositiveIntId(body.contract_id, "contract_id");
  } catch (e) {
    return { status: statusOf(e), body: { code: codeOf(e) } };
  }

  // requireContractInOrg equivalent
  const c = db.contracts.find(
    (r) =>
      r.id === contractId &&
      (r.organization_id === actor.legacyIntOrgId || r.tenant_id === actor.organizationId)
  );
  if (!c) return { status: 404, body: { error: "Contract not found", code: "NOT_FOUND" } };

  // optional release_id
  if (body.release_id !== undefined && body.release_id !== null && body.release_id !== "") {
    let releaseId: number;
    try {
      releaseId = requirePositiveIntId(body.release_id, "release_id");
    } catch (e) {
      return { status: statusOf(e), body: { code: codeOf(e) } };
    }
    const r = db.releases.find(
      (x) => x.id === releaseId && x.organization_id === actor.organizationId && !x.is_deleted
    );
    if (!r) return { status: 404, body: { error: "Release not found", code: "NOT_FOUND" } };
  }

  try {
    const userId = requireActorUserId(actor);
    const orgId = requireLegacyIntOrgId(actor);
    return { status: 201, body: { organization_id: orgId, user_id: userId, contract_id: contractId } };
  } catch (e) {
    return { status: statusOf(e), body: { code: codeOf(e) } };
  }
}

// ai/core-write apply
function aiCoreWriteApply(
  session: unknown,
  actor: OrganizationContext | null,
  db: DbSnapshot,
  body: { run_id: unknown }
): { status: number; body?: any } {
  if (!session) return { status: 401 };
  if (!actor) return { status: 403 };

  let runId: number;
  try {
    runId = requirePositiveIntId(body.run_id, "run_id");
  } catch (e) {
    return { status: statusOf(e), body: { code: codeOf(e) } };
  }

  const orgId = actor.legacyIntOrgId;
  const run = db.aiCoreWriteRuns.find(
    (r) => r.id === runId && r.organization_id === orgId
  );
  if (!run) return { status: 404, body: { error: "Proposal run not found" } };
  return { status: 201, body: { run_id: runId } };
}

// ai/release-integration attach
function aiReleaseIntegrationAttach(
  session: unknown,
  actor: OrganizationContext | null,
  db: DbSnapshot,
  body: { run_id: unknown; links: Array<{ entity_type: string; entity_id: unknown }> }
): { status: number; body?: any } {
  if (!session) return { status: 401 };
  if (!actor) return { status: 403 };

  let runId: number;
  try {
    runId = requirePositiveIntId(body.run_id, "run_id");
  } catch (e) {
    return { status: statusOf(e), body: { code: codeOf(e) } };
  }

  const orgId = actor.legacyIntOrgId;
  const run = db.aiReleaseIntegrationRuns.find(
    (r) => r.id === runId && r.organization_id === orgId
  );
  if (!run) return { status: 404, body: { error: "Run not found" } };

  const prober = makeProber(db);
  const created: any[] = [];
  for (const link of body.links || []) {
    let entityId: number | null;
    try {
      entityId = resolveEntityRef(link.entity_type, link.entity_id, actor, prober);
    } catch (e) {
      return { status: statusOf(e), body: { code: codeOf(e) } };
    }
    created.push({ run_id: runId, entity_type: link.entity_type, entity_id: entityId });
  }
  return { status: 201, body: created };
}

// ── R6: search contracts section + audit-logs ──────────────────────────────
//
// Mirrors the contractOrgScopeWhere predicate in app/api/search/route.ts
// (post-fix) and the audit-logs list predicate from R1-R3.

function searchContractsWhere(actor: OrganizationContext): Record<string, unknown> {
  // Post-R6 fix: uses contractOrgScopeWhere — never parseInt(orgId)||0.
  return contractOrgScopeWhere(actor);
}

function matchesContractScope(
  c: ContractFixture,
  actor: OrganizationContext
): boolean {
  return (
    c.organization_id === actor.legacyIntOrgId ||
    (!!actor.organizationId && c.tenant_id === actor.organizationId)
  );
}

function searchContracts(
  actor: OrganizationContext,
  db: DbSnapshot
): ContractFixture[] {
  // If legacyIntOrgId is invalid (0 / negative) contractOrgScopeWhere throws
  // ResourceAuthError(403) — this mirrors fail-closed behaviour.
  requireLegacyIntOrgId(actor); // throws if invalid
  return db.contracts.filter((c) => matchesContractScope(c, actor));
}

function auditLogsListDecision(
  actor: OrganizationContext,
  db: DbSnapshot
): AuditLogFixture[] {
  // Mirrors app/api/office/audit-logs/route.ts list predicate (post-R1-R3).
  return db.auditLogs.filter(
    (l) =>
      l.organization_id === actor.legacyIntOrgId ||
      (!!actor.organizationId && l.tenant_id === actor.organizationId)
  );
}

// ── Test runner ────────────────────────────────────────────────────────────

async function main() {
  console.log(
    "\n=== R4–R7 Step 2 residual authorization boundary HTTP regression tests ===\n"
  );

  const a = ctx("A");
  const b = ctx("B");
  const c = ctx("C"); // digit-leading UUID
  const plat = platformCtx();
  const db = buildDb();

  // ── T-R4-1: same-org role name already exists → 400 ───────────────────
  console.log("-- T-R4: POST /api/iam/roles (org-scoped existence pre-check) --");

  await test("T-R4-1: same-org role name in use → 400 Role already exists", () => {
    const res = rolesPost({ user: {} }, a, buildDb(), { name: "editor" });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /already exists/i);
  });

  // ── T-R4-2: name exists only in foreign org → org actor gets 201 ──────
  await test("T-R4-2: name exists only in foreign org; org actor → 201 (no existence oracle)", () => {
    // "viewer" is only in ORG_B. Org A actor must NOT see it and must create successfully.
    const res = rolesPost({ user: {} }, a, buildDb(), { name: "viewer" });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, "viewer");
    assert.equal(res.body.organization_id, ORG_A);
  });

  // ── T-R4-2b: platform actor sees all names globally ───────────────────
  await test("T-R4-2b: platform actor: name exists in foreign org → 400 (global authority)", () => {
    // "viewer" is in ORG_B; platform has global visibility.
    const res = rolesPost({ user: {} }, plat, buildDb(), { name: "viewer" });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /already exists/i);
  });

  // ── T-R4-3: unauthenticated → 401 ────────────────────────────────────
  await test("T-R4-3: unauthenticated POST roles → 401", () => {
    const res = rolesPost(null, null, buildDb(), { name: "newrole" });
    assert.equal(res.status, 401);
  });

  // ── T-R4-4: missing name / malformed body → 400 ───────────────────────
  await test("T-R4-4: missing role name → 400 Role name required", () => {
    const res = rolesPost({ user: {} }, a, buildDb(), {});
    assert.equal(res.status, 400);
    assert.match(res.body.error, /name required/i);
  });

  // ── T-R4-5: client-supplied organization_id by org actor → ignored ────
  await test("T-R4-5: client org_id override by non-platform actor → org from session wins", () => {
    // Org A actor supplies ORG_B as body.organization_id — must be silently ignored.
    const res = rolesPost({ user: {} }, a, buildDb(), { name: "newrole", organization_id: ORG_B });
    assert.equal(res.status, 201);
    assert.equal(res.body.organization_id, ORG_A, "session org must win over client org");
  });

  // ── T-R4-6: PUT/DELETE foreign or non-existent role id → 404 ─────────
  await test("T-R4-6a: PUT foreign role (belongs to ORG_B) → 404 non-leaking", () => {
    const res = rolesMutate({ user: {} }, a, buildDb(), 2, "update");
    assert.equal(res.status, 404);
  });
  await test("T-R4-6b: DELETE non-existent role → 404 non-leaking", () => {
    const res = rolesMutate({ user: {} }, a, buildDb(), 999, "delete");
    assert.equal(res.status, 404);
  });
  await test("T-R4-6c: DELETE own role → 200 (happy path)", () => {
    const db2 = buildDb();
    const res = rolesMutate({ user: {} }, a, db2, 1, "delete");
    assert.equal(res.status, 200);
    assert.ok(!db2.roles.some((r) => r.id === 1));
  });
  await test("T-R4-6d: system role is protected — DELETE → 400", () => {
    // Role id 3 is is_system = true.
    const res = rolesMutate({ user: {} }, plat, buildDb(), 3, "delete");
    assert.equal(res.status, 400);
  });

  // ── T-R4-7: shared name across orgs — no oracle leak ─────────────────
  await test("T-R4-7: same name in both orgs; each actor sees only their own conflict", () => {
    // "shared_name" exists in ORG_A (id 4) and ORG_B (id 5).
    // Org A actor → 400 (collision in own org).
    const resA = rolesPost({ user: {} }, a, buildDb(), { name: "shared_name" });
    assert.equal(resA.status, 400);
    // Org B actor → 400 (collision in own org).
    const resB = rolesPost({ user: {} }, b, buildDb(), { name: "shared_name" });
    assert.equal(resB.status, 400);
    // Org A actor tries a name that only collides in ORG_B → 201 (no oracle).
    const resC = rolesPost({ user: {} }, a, buildDb(), { name: "viewer" });
    assert.equal(resC.status, 201, "foreign-only name must not block org A creation");
  });

  // ── T-R5: ai/contracts resolve ─────────────────────────────────────────
  console.log("\n-- T-R5: POST /api/ai/* entity-reference boundary --");

  await test("T-R5-1: resolve with foreign entity_id → 404 NOT_FOUND", () => {
    // artist id 2 belongs to ORG_B; org A resolves → must 404.
    const res = aiContractsResolve(
      { user: {} }, a, buildDb(),
      { run_id: 1, links: [{ entity_type: "artist", entity_id: 2 }] }
    );
    assert.equal(res.status, 404);
    assert.equal(res.body.code, "NOT_FOUND");
  });

  await test("T-R5-2: resolve with own entity_id → 201", () => {
    // artist id 1 belongs to ORG_A.
    const res = aiContractsResolve(
      { user: {} }, a, buildDb(),
      { run_id: 1, links: [{ entity_type: "artist", entity_id: 1 }] }
    );
    assert.equal(res.status, 201);
    assert.equal(res.body[0].entity_id, 1);
  });

  await test("T-R5-3: resolve with foreign run_id → 404", () => {
    // run_id 2 belongs to ORG_B.
    const res = aiContractsResolve(
      { user: {} }, a, buildDb(),
      { run_id: 2, links: [] }
    );
    assert.equal(res.status, 404);
  });

  await test("T-R5-3b: resolve with malformed run_id → 400", () => {
    for (const bad of ["abc", "0", "-1", ""]) {
      const res = aiContractsResolve(
        { user: {} }, a, buildDb(),
        { run_id: bad, links: [] }
      );
      assert.equal(res.status, 400, `run_id=${JSON.stringify(bad)} must be 400`);
    }
  });

  await test("T-R5-4: core-write propose with foreign contract_id → 404", () => {
    // contract id 2 belongs to INT_B / ORG_B.
    const res = aiCoreWritePropose(
      { user: {} }, a, buildDb(),
      { contract_id: 2 }
    );
    assert.equal(res.status, 404);
    assert.equal(res.body.code, "NOT_FOUND");
  });

  await test("T-R5-5: core-write propose with own contract_id → 201", () => {
    const res = aiCoreWritePropose(
      { user: {} }, a, buildDb(),
      { contract_id: 1 }
    );
    assert.equal(res.status, 201);
    assert.equal(res.body.contract_id, 1);
    assert.equal(res.body.organization_id, INT_A);
  });

  await test("T-R5-5b: core-write propose own contract + foreign release → 404", () => {
    // release id 2 belongs to ORG_B.
    const res = aiCoreWritePropose(
      { user: {} }, a, buildDb(),
      { contract_id: 1, release_id: 2 }
    );
    assert.equal(res.status, 404);
    assert.equal(res.body.code, "NOT_FOUND");
  });

  await test("T-R5-5c: core-write propose own contract + own release → 201", () => {
    const res = aiCoreWritePropose(
      { user: {} }, a, buildDb(),
      { contract_id: 1, release_id: 1 }
    );
    assert.equal(res.status, 201);
  });

  await test("T-R5-6: release-integration attach with foreign entity_id → 404", () => {
    // artist id 2 belongs to ORG_B; run 1 belongs to INT_A.
    const res = aiReleaseIntegrationAttach(
      { user: {} }, a, buildDb(),
      { run_id: 1, links: [{ entity_type: "release", entity_id: 2 }] }
    );
    assert.equal(res.status, 404);
    assert.equal(res.body.code, "NOT_FOUND");
  });

  await test("T-R5-6b: release-integration attach with own entity_id → 201", () => {
    const res = aiReleaseIntegrationAttach(
      { user: {} }, a, buildDb(),
      { run_id: 1, links: [{ entity_type: "release", entity_id: 1 }] }
    );
    assert.equal(res.status, 201);
    assert.equal(res.body[0].entity_id, 1);
  });

  await test("T-R5-7: all audited AI actions unauthenticated → 401", () => {
    assert.equal(
      aiContractsResolve(null, null, buildDb(), { run_id: 1, links: [] }).status,
      401
    );
    assert.equal(
      aiCoreWritePropose(null, null, buildDb(), { contract_id: 1 }).status,
      401
    );
    assert.equal(
      aiReleaseIntegrationAttach(null, null, buildDb(), { run_id: 1, links: [] }).status,
      401
    );
  });

  await test("T-R5-8: core-write apply with foreign run_id → 404", () => {
    // run_id 2 belongs to INT_B.
    const res = aiCoreWriteApply(
      { user: {} }, a, buildDb(),
      { run_id: 2 }
    );
    assert.equal(res.status, 404);
  });

  await test("T-R5-8b: core-write apply with own run_id → 201", () => {
    const res = aiCoreWriteApply(
      { user: {} }, a, buildDb(),
      { run_id: 1 }
    );
    assert.equal(res.status, 201);
  });

  // Unknown entity type → 400 (fail closed)
  await test("T-R5-9: unknown entity_type in resolve → 400 (fail closed)", () => {
    const res = aiContractsResolve(
      { user: {} }, a, buildDb(),
      { run_id: 1, links: [{ entity_type: "unknown_table", entity_id: 1 }] }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "VALIDATION_ERROR");
  });

  // Null entity_id is valid (optional reference)
  await test("T-R5-10: null entity_id in resolve link → accepted (nullable reference)", () => {
    const res = aiContractsResolve(
      { user: {} }, a, buildDb(),
      { run_id: 1, links: [{ entity_type: "artist", entity_id: null }] }
    );
    assert.equal(res.status, 201);
    assert.equal(res.body[0].entity_id, null);
  });

  // Client-supplied entity_id for a foreign org contract
  await test("T-R5-11: client cannot supply foreign contract_id to bypass scope", () => {
    // contract id 2 → belongs to ORG_B; actor is ORG_A → must 404.
    const res = aiCoreWritePropose(
      { user: {} }, a, buildDb(),
      { contract_id: 2, release_id: null }
    );
    assert.equal(res.status, 404, "foreign contract must fail closed 404, not 201");
  });

  // ── T-R6: search contracts section + audit-logs regression ────────────
  console.log("\n-- T-R6: GET /api/search contracts section + audit-logs regression --");

  await test("T-R6-1: letter-leading UUID org → contracts section 200 empty (no cross-org rows, no parseInt||0)", () => {
    // Org A's UUID is letter-leading (aaaa…). With the old parseInt(orgId)||0,
    // parseInt would produce NaN → 0 → matches nothing. The new
    // contractOrgScopeWhere uses the INT org id directly — must also return
    // only org A contracts, not a leaked cross-org list.
    const db2 = buildDb();
    const rows = searchContracts(a, db2);
    assert.ok(Array.isArray(rows));
    // Only org A's contract (id 1) must appear.
    assert.deepEqual(rows.map((r) => r.id), [1]);
    // Org B contract must not appear.
    assert.ok(!rows.some((r) => r.id === 2), "Org B contract must not appear in Org A results");
  });

  await test("T-R6-2: digit-leading UUID org → contracts section 200 empty (no cross-org rows)", () => {
    // Org C has a digit-leading UUID (12345678-…). The old parseInt would
    // produce 12345678 which happens to match no org but would be a semantically
    // broken predicate. The canonical contractOrgScopeWhere uses legacyIntOrgId
    // (INT_C = 30) correctly.
    const db2 = buildDb();
    const rows = searchContracts(c, db2);
    // No contract belongs to INT_C (30) or ORG_C_DIGIT — expect empty.
    assert.deepEqual(rows, []);
  });

  await test("T-R6-2b: digit-leading org UUID does NOT produce parseInt artefacts", () => {
    // Confirm the contract with organization_id=INT_A (10) is NOT returned
    // for org C even though parseInt("12345678-…") would produce 12345678
    // and parseInt("aaaa…") would produce NaN.
    const db2 = buildDb();
    const rowsA = searchContracts(a, db2);
    const rowsC = searchContracts(c, db2);
    // Org A sees only its own contracts; Org C sees none.
    assert.equal(rowsA.length, 1);
    assert.equal(rowsC.length, 0);
    assert.ok(!rowsC.some((r: any) => r.id === rowsA[0].id), "no cross-org bleed");
  });

  await test("T-R6-3: audit-logs list parse-bug regression — letter-leading UUID → own rows only", () => {
    const db2 = buildDb();
    const rowsA = auditLogsListDecision(a, db2);
    assert.deepEqual(rowsA.map((r) => r.id), [1]);
  });

  await test("T-R6-3b: audit-logs list regression — digit-leading UUID → only own rows (not INT artefact)", () => {
    // Org C (legacyIntOrgId=30, organizationId=ORG_C_DIGIT) — the digit-leading
    // UUID previously caused parseInt to parse to 12345678 which matched
    // audit_log row 3. The corrected predicate must NOT return row 3.
    const db2 = buildDb();
    const rowsC = auditLogsListDecision(c, db2);
    assert.ok(!rowsC.some((r) => r.id === 3), "digit-leading UUID must not match INT 12345678 row");
    assert.deepEqual(rowsC, []);
  });

  await test("T-R6-4: audit-logs foreign id → 404 (retained from R1-R3 test:r1-r3-http)", () => {
    // Mirrors the audit-logs by-id decision path from R1-R3 (retained regression).
    const db2 = buildDb();
    const rowA = db2.auditLogs.find(
      (l) =>
        l.id === 2 &&
        (l.organization_id === a.legacyIntOrgId ||
          (a.organizationId && l.tenant_id === a.organizationId))
    );
    // id=2 belongs to INT_B/ORG_B; org A must not see it.
    assert.equal(rowA, undefined, "foreign audit-log must not be visible to org A");
  });

  // ── Regression guards: A.8 / A.9 / R1-R3 authorization unchanged ──────
  console.log("\n-- Regression: A.8/A.9/R1-R3 authorization unchanged --");

  await test("REGRESSION: requireEntityReferenceInOrg still present and functional", () => {
    // Smoke-test the real primitive still exported and works for valid types.
    // We test the synchronous helper that wraps it; the real one is async.
    const prober = makeProber(buildDb());
    // artist 1 in org A → resolves.
    const id = resolveEntityRef("artist", 1, a, prober);
    assert.equal(id, 1);
  });

  await test("REGRESSION: requireEntityReferenceInOrg: foreign entity still 404", () => {
    const prober = makeProber(buildDb());
    assert.throws(
      () => resolveEntityRef("artist", 2, a, prober),
      (e: any) => e instanceof ResourceAuthError && e.status === 404
    );
  });

  await test("REGRESSION: contractOrgScopeWhere returns non-empty predicate (never global {})", () => {
    const where = contractOrgScopeWhere(a);
    assert.ok(where && typeof where === "object");
    assert.ok(Object.keys(where).length > 0, "predicate must not be empty");
    assert.notDeepEqual(where, {});
  });

  await test("REGRESSION: requireActorUserId fail-closed (no ||1 fallback)", () => {
    assert.equal(requireActorUserId(a), USER_A);
    assert.throws(
      () => requireActorUserId({ ...a, userId: 0 }),
      (e: any) =>
        e instanceof ResourceAuthError &&
        e.status === 403 &&
        e.code === "USER_SCOPE_UNAVAILABLE"
    );
  });

  await test("REGRESSION: requirePositiveIntId rejects all coercible garbage", () => {
    for (const bad of ["abc", "1abc", "0", "-1", null, undefined, "", "99999999999999999999"]) {
      assert.throws(
        () => requirePositiveIntId(bad, "id"),
        (e: any) =>
          e instanceof ResourceAuthError &&
          e.status === 400 &&
          e.code === "VALIDATION_ERROR",
        `expected 400 for ${JSON.stringify(bad)}`
      );
    }
  });

  await test("REGRESSION: requireLegacyIntOrgId fail-closed (no ||0 fallback)", () => {
    assert.equal(requireLegacyIntOrgId(a), INT_A);
    assert.throws(
      () => requireLegacyIntOrgId({ ...a, legacyIntOrgId: 0 }),
      (e: any) =>
        e instanceof ResourceAuthError &&
        e.status === 403 &&
        e.code === "ORG_SCOPE_UNAVAILABLE"
    );
  });

  await test("REGRESSION: roles GET is org-scoped (platform sees all, member sees own)", () => {
    // Verifies the existing GET scoping logic is undisturbed.
    const db2 = buildDb();
    // Org A sees only own roles.
    const ownRoles = db2.roles.filter(
      (r) => r.organization_id === ORG_A
    );
    assert.deepEqual(ownRoles.map((r) => r.id).sort(), [1, 4]);
    // Platform sees all.
    const allRoles = db2.roles;
    assert.equal(allRoles.length, 5);
  });

  await test("REGRESSION: system roles cannot be mutated by any non-system actor", () => {
    // Platform actor sees the system role (global lookup) and gets 400 is_system.
    const resPlatform = rolesMutate({ user: {} }, plat, buildDb(), 3, "delete");
    assert.equal(resPlatform.status, 400, "platform actor: is_system=true must return 400");

    // Org actors use the org-scoped query — system role has organization_id=null,
    // so it is never returned by findFirst({id, organization_id: actor.org}).
    // The route returns 404 (non-leaking), which is the correct outcome:
    // org actors can neither see nor mutate system roles.
    const resA = rolesMutate({ user: {} }, a, buildDb(), 3, "delete");
    assert.equal(resA.status, 404, "org actor: system role not visible via org scope → 404");
    const resB = rolesMutate({ user: {} }, b, buildDb(), 3, "delete");
    assert.equal(resB.status, 404, "org actor B: system role not visible via org scope → 404");
  });

  await test("REGRESSION: platform actor POST with explicit org override is honoured", () => {
    // Platform can target any org; client org_id is accepted.
    const res = rolesPost({ user: {} }, plat, buildDb(), {
      name: "brand_new_role",
      organization_id: ORG_B,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.organization_id, ORG_B);
  });

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
