# R4–R7 — Vercel Redeployment & Failure Isolation Report

**Mode:** Deployment-verification gate only. No commit, push, source edit, Neon change, IAM change, environment-variable change, or new Vercel production deploy was performed.

**Date:** 2026-08-17

**Verdict:** `BLOCKED`

---

## Baseline

| Item | Value |
|------|-------|
| Branch | `main` |
| HEAD SHA | `911c4831db26b34170e687776081a3e40c085270` |
| Parent SHA | `2a2ecfdd7b44b61e90c2d50e40325d82b6cae512` |
| HEAD subject | `feat(security): harden R1-R3 residual authorization boundaries` |
| `origin/main` | `911c4831db26b34170e687776081a3e40c085270` |
| `HEAD == origin/main` | **YES** (ahead 0 / behind 0 after `git fetch origin`) |
| Unpushed commits on `main` | **none** |

### Working-tree state (left untouched)

Modified vs HEAD:

- `.gitignore`
- `app/api/ai/contracts/route.ts`
- `app/api/ai/core-write/route.ts`
- `app/api/ai/release-integration/route.ts`
- `app/api/iam/roles/route.ts`
- `app/api/search/route.ts`
- `lib/ai-audit.ts`
- `lib/audit.ts`
- `lib/auth/resource-authorization.ts`
- `lib/reports.ts`
- `next-env.d.ts`
- `package-lock.json` (local lockfile reconciliation from the previous gate)
- `package.json` (script only: `test:r4-r7-http`)
- `scripts/reconcile-iam-owner-platform-admin.ts`
- `tsconfig.tsbuildinfo`

Untracked: prior-milestone identity reports, `r4-r7-dependency-lockfile-fix-report.md`, `r4-r7-step1-residual-boundary-audit.md`, `lib/auth/__tests__/r4-r7-http-boundary.test.ts`, and this report.

Nothing was staged, committed, reset, stashed, amended, rebased, or discarded.

### Confirmation: R4–R7 implementation present?

**Yes, in the working tree only. Not in `HEAD`. Not on `origin/main`.**

Working-tree vs `911c483` includes the R4–R7 route/helper/lockfile edits (roles, AI contracts/core-write/release-integration, search, audit/report helpers, `resource-authorization.ts`, lockfile flags).

Those changes have **no commit SHA**.

### Confirmation: lockfile reconciliation present?

**Yes, in the working tree only.** `package-lock.json` differs from HEAD by the previous gate’s 11 flag-only `dev` → `devOptional` updates. That file is not on `origin/main`.

### Remote R4–R7 branch (observed, not the evaluated tree)

`origin/security/r4-r7-residual-boundary-remediation` exists and is pushed. Tip:

- `07dbd285229f14a666fadb047d528bc2ef6ae288` — `fix(build): promote runtime build dependencies`

`07dbd28` is **not** an ancestor of `origin/main`. The local working tree is **not** that branch (large source diffs; different `package.json` classification). This gate evaluated the current `main` working tree, not a checkout of that branch.

---

## Deployment

### Production (currently live — not newly created by this gate)

No new production deployment was created. Git-triggered production deploys `main`. `main` is still `911c483` (R1–R3). Deploying that SHA again would not deploy R4–R7. Deploying the uncommitted working tree via `vercel --prod` would violate “exact Git state” and the no-push / no-uncommitted-production-deploy rule.

| Field | Value |
|-------|-------|
| Vercel project | `otto-cloud` (`prj_E2LdGoxTckqv3jNmcgWkI2WFY2rH`) |
| Org / scope | `okeldijitals-projects` (`team_VzHOOzoHKJEIYLEvdasL4nVx`) |
| Vercel CLI | 58.1.0, authenticated as `okeldijital` |
| Production deployment ID | `dpl_7S9D1mDUx6gKyDawtGMFZtvmZKa4` |
| Deployment URL | `https://otto-cloud-cq0nsropb-okeldijitals-projects.vercel.app` |
| Production aliases | `https://otto-cloud.vercel.app`, `https://otto.okeldijital.africa`, `https://otto-cloud-okeldijitals-projects.vercel.app`, `https://otto-cloud-git-main-okeldijitals-projects.vercel.app` |
| Deployment state | **Ready** |
| Build state | Ready (historical git-triggered production build of `main`) |
| Deployed commit SHA | `911c4831db26b34170e687776081a3e40c085270` |
| Deployed branch | `main` |
| Deployed subject | `feat(security): harden R1-R3 residual authorization boundaries` |
| Created | 2026-08-13 13:09:00 +0200 |
| Framework | Next.js 16.2.7 (Turbopack) — from project history / prior successful builds |
| Build command | `npm run build` (`vercel.json`) |
| Install command | `npm install --legacy-peer-deps` (`vercel.json`; not modified) |
| Node.js version | Project listed as `24.x` |
| npm version (this production build) | **not printed** in the inspect summary |
| SHA match vs intended R4–R7 tree | **NO.** Live production is R1–R3 `911c483`. Intended R4–R7 working-tree changes have no SHA. |

`GET https://otto-cloud.vercel.app/api/health` (read-only) → **HTTP 200** `{"status":"healthy","ok":true,"database":"connected"}`.

### Hard stop — production deploy of evaluated R4–R7 tree

**Hard stop 1 applied.** The intended R4–R7 implementation + lockfile reconciliation are uncommitted on `main` and therefore not pushed. Push authorization was not granted. No push was performed. **Production redeployment of R4–R7 cannot proceed.**

---

## Build

### Local (previous lockfile gate; not re-run after hard stop)

Recorded against the local working tree, not against a new Vercel deployment:

| Gate | Result |
|------|--------|
| `npm ci` | PASS |
| lint | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| A.8 / A.9 / R1–R3 / R4–R7 HTTP / identity | PASS |
| `git diff --check` | PASS |

This gate did **not** re-run those commands. Hard stop 1 fired before a deployable R4–R7 SHA existed. Gate 5 required suites against the **deployed** source tree; no new R4–R7 deploy exists.

### Existing Vercel preview builds of `security/r4-r7-residual-boundary-remediation`

These deployments already existed. They were inspected only. They are **not** production.

#### Latest preview (branch tip)

| Field | Value |
|-------|-------|
| Deployment ID | `dpl_D7VsJYQ7t9Rcja72YUDqBM7P7K2c` |
| URL | `https://otto-cloud-kg1q0aoar-okeldijitals-projects.vercel.app` |
| Alias | `https://otto-cloud-git-security-r4-r7-resi-3a2380-okeldijitals-projects.vercel.app` |
| Environment | Preview |
| State | **Error** |
| Source commit | `07dbd285229f14a666fadb047d528bc2ef6ae288` |
| Branch | `security/r4-r7-residual-boundary-remediation` |
| Subject | `fix(build): promote runtime build dependencies` |
| Created | 2026-08-17 13:06:28 +0200 |
| Region | iad1 (Washington, D.C., USA East) |
| Machine | 2 cores, 8 GB |
| Vercel CLI (build) | 58.1.0 |
| Next.js | 16.2.7 (Turbopack) |
| Install command | `npm install --legacy-peer-deps` |
| Install result | **PASS** — `prisma generate` succeeded; `up to date, audited 803 packages` |
| Build command | `npm run build` |
| Build result | **FAIL** — `Error: Command "npm run build" exited with 1` |
| Duration | ~1 minute (clone 12.004s + install ~10s + compile until 11:07:35Z) |

**Failing step:** Next.js / Turbopack production compile (not install, not Prisma generate, not lint, not tests, not packaging).

**First meaningful error** (`dpl_D7VsJYQ7t9Rcja72YUDqBM7P7K2c` build log):

```text
> Build error occurred
Error: Turbopack build failed with 1 errors:
./app/api/ai/contracts/route.ts:29:9
Expected ',', got ';'
27 |         const entity = await requireAIEntityInOrg(entityType, link.entity_id, ctx);
28 |         return { entity_type: entity.entityType, entity_id: entity.entityId, action: link....
> 29 |       });
     |         ^
Parsing ecmascript source code failed
Error: Command "npm run build" exited with 1
```

Source at `07dbd28:app/api/ai/contracts/route.ts` lines 24–29:

```ts
const normalizedLinks = await Promise.all((Array.isArray(body.links) ? body.links : []).map(async (link: any) => {
  ...
  return { entity_type: entity.entityType, entity_id: entity.entityId, ... };
});
```

`Promise.all(` is opened and never closed. The `.map(...)` callback is closed with `});` instead of `}));`. That is a syntax error in the pushed feature-branch file.

The same error is present on the immediately previous preview `d71092b` (`https://otto-cloud-jwwqhmuoa-okeldijitals-projects.vercel.app`).

#### Earlier preview in the same Error streak (different first error)

| Field | Value |
|-------|-------|
| Deployment ID | `dpl_GSopKhuybckLwJrGQsoh8RNPkfgL` |
| URL | `https://otto-cloud-iv3rjbpzy-okeldijitals-projects.vercel.app` |
| State | Error |
| Commit | `92f82c11` — `test(security): add R4-R7 boundary regression gate` |
| Install | `npm install --legacy-peer-deps` ran |
| First meaningful error | Turbopack: `Cannot find module 'tailwindcss'` from `./app/globals.css` |

On `92f82c1`, `tailwindcss` is absent from `dependencies`, `devDependencies`, and `optionalDependencies`. That is a **missing-manifest-entry** failure, not the local lockfile-flag reconciliation.

#### Last READY preview on that branch

| Field | Value |
|-------|-------|
| Deployment ID | `dpl_3i8j6YVUhb8dyfyxQhFez2oc1gKM` |
| URL | `https://otto-cloud-57qry50ml-okeldijitals-projects.vercel.app` |
| State | Ready |
| Commit | `8819a01e` — `fix(security): remove AI audit organization coercion` |

Sixteen subsequent preview deployments on the same branch are Error.

### Failure isolation (Gate 6)

| Question | Answer |
|----------|--------|
| New production deploy of evaluated tree? | **Not performed** (hard stop 1) |
| Latest Vercel failure inspected? | Preview `dpl_D7VsJYQ7t9Rcja72YUDqBM7P7K2c` |
| Failing step | Next.js Turbopack compile (`npm run build`) |
| Install / Prisma generate | Succeeded on `07dbd28` |
| Classification of latest failure | **source-code** |
| Exact file | `app/api/ai/contracts/route.ts` line 29 on commit `07dbd28` |
| Lockfile reconciliation the cause of latest failure? | **No.** Install completed. The failure is a parse error. |
| Compare to local `npm ci` + build | Local working tree is a **different** `contracts/route.ts` and built successfully. Local lockfile flag rewrite is not what Vercel compiled. |
| Earlier `92f82c1` failure class | **dependency / missing package** (`tailwindcss` omitted from that commit’s `package.json`) |

**No second fix was implemented in this gate.**

---

## Security verification

Production is `911c483` (R1–R3). The R4–R7 production matrix was **not** executed against that SHA. The latest R4–R7 preview is **Error** and was not used for HTTP probes.

| Check | Result |
|-------|--------|
| R4 — IAM role boundary | **NOT RUN** — no R4–R7 production/READY deploy of the evaluated tree |
| R5 — AI entity ownership | **NOT RUN** |
| R6 — coercion / fallback | **NOT RUN** |
| R7 — generated artifacts | Working-tree `next-env.d.ts` / `tsconfig.tsbuildinfo` remain uncommitted leftovers. They are not in `911c483`. Not verified on a new R4–R7 production build because none exists. |
| A.8 regression (production) | **NOT RUN** in this gate |
| A.9 regression (production) | **NOT RUN** in this gate |
| R1–R3 regression (production) | **NOT RUN** in this gate |
| Local suites (prior gate, working tree) | Previously PASS; not re-run here |

Read-only production health on the live R1–R3 deployment: `/api/health` 200, database connected. That does **not** constitute R4–R7 acceptance.

---

## Production safety

| Action | Occurred? |
|--------|-----------|
| Neon writes | **No** |
| Migrations | **No** |
| IAM writes | **No** |
| Reconciliation | **No** |
| Production data changes | **No** |
| Environment-variable changes | **No** |
| Secret rotation | **No** |
| Domain changes | **No** |
| Source changes during this gate | **No** |
| Commit | **No** |
| Push | **No** |
| New Vercel production deploy | **No** |
| `vercel --prod` / CLI deploy of working tree | **No** |

Only Vercel CLI **read** operations (`whoami`, `ls`, `inspect`, `--logs`) and one production `GET /api/health` were performed.

---

## Verdict

`BLOCKED`

Reasons (hard stops):

1. **Intended R4–R7 commit is not pushed.** The evaluated implementation and lockfile reconciliation exist only in the dirty `main` working tree. Push authorization was required and was not given.
2. **No new deployment SHA can be verified as R4–R7.** Live production alias `https://otto-cloud.vercel.app` still points to `dpl_7S9D1mDUx6gKyDawtGMFZtvmZKa4` / `911c483`.
3. **A source-code defect already fails Vercel on the pushed feature branch.** `07dbd28` preview `dpl_D7VsJYQ7t9Rcja72YUDqBM7P7K2c` fails Turbopack parse of `app/api/ai/contracts/route.ts:29`. That defect was identified and **not** fixed in this gate.

Not used as the official verdict, but recorded:

- This is **not** `PASS` (no R4–R7 production deploy; no R4–R7 production security matrix).
- This is **not** `FAIL — VERCEL` for a production deploy this gate created (none was created). The existing feature-branch preview **is** a Vercel build failure and is isolated above.
- This is **not** `FAIL — R4–R7` from a production security probe (probes were not run).

### Required to unblock the next gate

1. Separate authorization to **commit and push** a single intended R4–R7 SHA (do not silently merge the divergent feature branch with the local working tree).
2. A follow-up **one-failure** fix for the identified parse error on whatever SHA is actually pushed, if that SHA still contains `app/api/ai/contracts/route.ts:29` `Expected ',', got ';'`.
3. Then a new deployment-verification gate against that SHA.

Do not treat the local lockfile-only change as sufficient to redeploy production.
