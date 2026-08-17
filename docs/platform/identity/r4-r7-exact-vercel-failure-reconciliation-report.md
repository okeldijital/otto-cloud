# R4–R7 — Exact Vercel Failure Source Reconciliation

**Mode:** Diagnose `07dbd28` vs the dirty local R4–R7 tree. No historical SHA rewrite. No commit, push, deploy, Neon, or IAM change.

**Date:** 2026-08-17

**Verdict:** `HISTORICAL FAILURE CONFIRMED — CURRENT TREE ALREADY FIXED`

---

## Baseline

| Item | Value |
|------|-------|
| Current branch | `main` |
| Current HEAD | `911c4831db26b34170e687776081a3e40c085270` |
| `origin/main` | `911c4831db26b34170e687776081a3e40c085270` |
| `HEAD == origin/main` | YES |
| Historical failing SHA | `07dbd285229f14a666fadb047d528bc2ef6ae288` |
| Historical failing subject | `fix(build): promote runtime build dependencies` |
| Historical failing parent | `d71092bae097c303b90c4a397e73c6a19d13b20c` |
| Historical failing branch | `security/r4-r7-residual-boundary-remediation` |
| Historical deployment | `dpl_D7VsJYQ7t9Rcja72YUDqBM7P7K2c` |
| Merge-base(`07dbd28`, HEAD) | `911c483` |
| `07dbd28` ancestor of HEAD? | No |
| HEAD ancestor of `07dbd28`? | Yes — feature branch forked from current `main` |

`07dbd28` was **not** amended, force-pushed, checked out, or reset onto. The dirty local tree was not discarded.

---

## Historical failure

| Item | Value |
|------|-------|
| Deployment | `dpl_D7VsJYQ7t9Rcja72YUDqBM7P7K2c` |
| Install | PASS (`npm install --legacy-peer-deps`) |
| Prisma generate | PASS |
| Build | FAIL — Turbopack parse |
| File | `app/api/ai/contracts/route.ts` |
| Line | `29` |
| Error | `Expected ',', got ';'` |

### Exact source at `07dbd28` (resolve / Promise.all)

```ts
22    if (action === "resolve") {
23      const body = await req.json(); const runId = requirePositiveIntId(body.run_id, "run_id"); ...
24      const normalizedLinks = await Promise.all((Array.isArray(body.links) ? body.links : []).map(async (link: any) => {
25        const entityType = String(link?.entity_type ?? "").trim(); ...
26        if (link?.entity_id === undefined || ...) return { ... };
27        const entity = await requireAIEntityInOrg(entityType, link.entity_id, ctx);
28        return { entity_type: entity.entityType, entity_id: entity.entityId, ... };
29      });
30      const created = await Promise.all(normalizedLinks.map((link) => prisma.ai_contract_resolution_links.create({ ... })));
31      return NextResponse.json(created, { status: 201 });
32    }
```

Exact line 29: `      });`

### Exact malformed syntax

Line 24 opens `Promise.all((...).map(async (...) => {`.

Line 29 closes the **map callback** with `});` and never supplies the extra `)` that would close `Promise.all(`. The parser therefore sees `;` where it still expects `,` or `)`.

Required historical form would have been `}));` on line 29.

### Who introduced it

`git blame` on `07dbd28` lines 24–29:

| Line | Commit |
|------|--------|
| 24 (`Promise.all((...).map`) | `a8cb4af` — `fix(security): reuse canonical AI entity ownership guard` |
| 25 | `686b20f` |
| 26–29 (including the `});`) | `506c9f0` — `fix(security): use strict AI entity ownership validation` |

The defect is on the feature-branch history after `911c483`. It is **not** in HEAD and **not** in the current working-tree `ai/contracts` file.

---

## Reconciliation

### Files are different

`git diff 07dbd28 -- app/api/ai/contracts/route.ts` → **170 insertions / 22 deletions**.

They are not the same implementation.

| Aspect | `07dbd28` (Vercel compiled this) | Current working tree (authoritative R4–R7) |
|--------|----------------------------------|--------------------------------------------|
| Line 29 | `});` closing a broken `Promise.all` | `return NextResponse.json(run);` (GET extract) |
| Resolve helper | `requireAIEntityInOrg` from `lib/auth/ai-entity-authorization` | `requireEntityReferenceInOrg` from `lib/auth/resource-authorization` |
| `Promise.all` | one-line `Promise.all((...).map(...` then `});` | multi-line `Promise.all( (links\|\|[]).map(async ...) { ... } )` then `);` |
| Link writes | normalize first, then a second `Promise.all` to `create` | `create` inside the same map after org probe |
| Style | compacted one-liners | expanded, comments for R5/R6 |

### Current file is already the corrected equivalent

Current resolve block (lines 88–106):

```ts
const created = await Promise.all(
  (links || []).map(async (link: any) => {
    const entityId = await requireEntityReferenceInOrg(
      link.entity_type,
      link.entity_id,
      ctx
    );
    return prisma.ai_contract_resolution_links.create({
      data: { ... },
    });
  })
);
```

That `Promise.all(` is closed with `);` after the map callback. Local `npm run build` (Turbopack) compiled this file successfully. The historical `});` defect is not present.

The current file vs HEAD (`911c483`) already contains the intended R4–R7/R5 changes: `requireActorUserId`, `requirePositiveIntId` on `run_id`, per-link `requireEntityReferenceInOrg`, fail-closed `resourceAuthErrorResponse` / `orgContextErrorResponse`. Those must be preserved.

### Which commit introduced the difference

- Working-tree `ai/contracts` is an **uncommitted** evolution of `911c483` (dirty `main`).
- `07dbd28` is a later descendant of `911c483` on `security/r4-r7-residual-boundary-remediation` that rewrote the same file into a compacted `requireAIEntityInOrg` form and introduced the parse error (`a8cb4af` / `506c9f0`).
- The two lineages share `911c483` and then diverge. The local tree is **not** a checkout of `07dbd28`.

### Source change actually made in this gate

**None.**

Rationale: the current working-tree version already contains a syntactically valid, R5-preserving equivalent. Patching `});` → `}));` on the local file would be a redundant (and wrong) edit. Repairing `07dbd28` in place is forbidden.

The eventual R4–R7 commit must be a **new** commit descended from `911c483`, not a repair of the preview SHA.

---

## Validation

All run against the current dirty local tree after reconciliation (no source edit):

| Gate | Result |
|------|--------|
| `npm ci` | **PASS** (exit 0; 794 packages added, 795 audited; `prisma generate` OK) |
| `npx tsc --noEmit` | **PASS** (exit 0) |
| `npm run lint` | **PASS** (exit 0) |
| `npm run build` | **PASS** (exit 0; Next.js 16.2.7 Turbopack compiled; 211/211 pages) |
| `test:a8-idor` | **PASS** 13/0 |
| `test:a8-privilege` | **PASS** 27/0 |
| `test:a8-step5` | **PASS** 27/0 |
| `test:a8-http` | **PASS** 27/0 |
| `test:a9-http` | **PASS** 47/0 |
| `test:r1-r3-http` | **PASS** 32/0 |
| `test:r4-r7-http` | **PASS** 42/0 |
| `test:identity` | **PASS** (all nine files) |
| `git diff --check` | **PASS** (exit 0) |

`test:a8-http` still logs a pre-existing Prisma `DATABASE_URL` initialization error from the `test-db` probe; the assertion passed and the suite exit code was 0.

---

## Scope

This gate did not stage or alter application source. It only added this report.

### Current working tree (pre-existing; not changed here)

**Intended R4–R7 source / tests / lockfile / docs (keep for a later commit gate):**

- `app/api/ai/contracts/route.ts`
- `app/api/ai/core-write/route.ts`
- `app/api/ai/release-integration/route.ts`
- `app/api/iam/roles/route.ts`
- `app/api/search/route.ts`
- `lib/ai-audit.ts`
- `lib/audit.ts`
- `lib/auth/resource-authorization.ts`
- `lib/reports.ts`
- `package-lock.json` (prior lockfile flag reconciliation)
- `package.json` (`test:r4-r7-http` script only)
- `lib/auth/__tests__/r4-r7-http-boundary.test.ts`
- `docs/platform/identity/r4-r7-*.md` (R4–R7 reports including this one)

**Must not be included in the eventual R4–R7 commit** (still present, untouched):

- `.gitignore`
- `next-env.d.ts`
- `tsconfig.tsbuildinfo`
- `scripts/reconcile-iam-owner-platform-admin.ts`
- A.8 production-operation docs (`a8-step7` … `a8-step9`)
- A.9-only docs (`a9-*`)
- R1–R3 / production-access leftover docs

No `.env*`, `.local/**`, secrets, Prisma schema, or migrations were modified.

---

## Vercel

Read-only diagnosis only. No new deployment.

| Item | Status |
|------|--------|
| Historical failing SHA | `07dbd28` |
| Historical deployment | `dpl_D7VsJYQ7t9Rcja72YUDqBM7P7K2c` |
| Exact historical defect | `Promise.all((...).map(async () => { ... });` missing `)` — line 29 `});` |
| Current tree already fixes it? | **Yes** — different, valid `Promise.all` + R5 helper |
| Current file status | dirty vs `911c483`; syntactically valid; not `07dbd28` |
| Local build | PASS |
| Security suites | all PASS |
| This gate created a Vercel deploy? | **No** |

---

## Remaining blockers (for the next gate, not this one)

1. Nothing is committed. The next gate must authorize a **new** commit from `911c483` of the intended R4–R7 subset only.
2. Do not commit leftover generated artifacts, A.8/A.9-only docs, or the IAM reconciliation script.
3. Do not treat `07dbd28` or `dpl_D7VsJYQ7t9Rcja72YUDqBM7P7K2c` as the deployable SHA. That preview remains historically failed until a new SHA is pushed.
4. Push / production redeploy is **not** authorized by this gate.

---

## Verdict

**`HISTORICAL FAILURE CONFIRMED — CURRENT TREE ALREADY FIXED`**

Stopped. Awaiting the next explicit authorization to commit and push the reconciled R4–R7 tree.
