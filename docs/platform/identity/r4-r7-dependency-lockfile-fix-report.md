# R4–R7 — Vercel Failure Fix #1: Dependency Lockfile Reconciliation

**Mode:** Local lockfile reconciliation only. No commit, push, deploy, Neon change, IAM change, Vercel configuration change, or application-source change was made by this gate.

**Date:** 2026-08-17

---

## Baseline

| Item | Value |
|------|-------|
| Branch | `main` |
| HEAD SHA | `911c4831db26b34170e687776081a3e40c085270` |
| `origin/main` SHA | `911c4831db26b34170e687776081a3e40c085270` (identical to HEAD) |
| HEAD subject | `feat(security): harden R1-R3 residual authorization boundaries` |

Recent history at baseline:

```
911c483 feat(security): harden R1-R3 residual authorization boundaries
2a2ecfd feat(security): harden residual authorization boundaries
76c038b feat(security): harden IAM authorization boundaries
3cbcf03 feat(iam): deliver password-reset emails via Resend with log fallback
0214395 feat(iam): harden bootstrap, event validation, and ops recovery docs
```

### Initial working-tree state (left untouched)

Already modified vs HEAD before this gate:

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
- `package.json` (script only: added `test:r4-r7-http`)
- `scripts/reconcile-iam-owner-platform-admin.ts`
- `tsconfig.tsbuildinfo`

Already untracked before this gate:

- `docs/platform/identity/a8-*.md`, `a9-*.md`, `production-*.md`, `r1-r3-*.md`, `r4-r7-step1-residual-boundary-audit.md`
- `lib/auth/__tests__/r4-r7-http-boundary.test.ts`

Those files were not discarded, reset, or edited by this gate.

---

## Root cause

Inspected locations of the three named packages in the **existing** `package.json` (working tree, unchanged by this gate):

| Package | `package.json` location | Spec |
|---------|-------------------------|------|
| `@anthropic-ai/sdk` | `optionalDependencies` | `^0.104.1` |
| `openai` | `optionalDependencies` | `^6.42.0` |
| `tailwindcss` | `devDependencies` | `^3.4.19` |

The lockfile **root** package (`packages[""]`) already recorded the same classification and the same specs before regeneration:

| Package | Lockfile root location | `node_modules` flags before regen |
|---------|------------------------|-----------------------------------|
| `@anthropic-ai/sdk` | `optionalDependencies` `^0.104.1` | version `0.104.1`, `optional: true` |
| `openai` | `optionalDependencies` `^6.42.0` | version `6.42.0`, `optional: true` |
| `tailwindcss` | `devDependencies` `^3.4.19` | version `3.4.19`, `dev: true` |

`npm install --package-lock-only` completed with exit 0 (`up to date, audited 795 packages`) and did **not** change those three root entries.

What npm did change is lockfile **install-flag metadata** on 11 already-present transitive packages: `dev: true` was rewritten to `devOptional: true` (and `fsevents` dropped a redundant `dev: true` while remaining `optional: true`). No package versions, integrity hashes, resolved URLs, added packages, or removed packages changed.

Classification of the observed issue:

- **Manifest / lockfile metadata drift:** yes — npm rewrote `dev` vs `devOptional` flags so the lockfile matches how current npm classifies the existing tree.
- **Root spec mismatch for `@anthropic-ai/sdk` / `openai` / `tailwindcss`:** not observed. Those three were already aligned between `package.json` and `package-lock.json`.
- **npm install failure:** not observed locally. `npm install --package-lock-only` and subsequent `npm ci` both exited 0.
- **Package resolution failure:** not observed. No resolution error was printed.

This gate did not have a Vercel build log. The remote Vercel failure is therefore **not independently re-confirmed** here. Locally, the lockfile is now the deterministic npm-regenerated file for the existing manifest, and `npm ci` succeeds.

---

## Change

### `package.json`

**Unchanged by this gate.**

`npm install --package-lock-only` did not rewrite `package.json`. The only `package.json` delta vs HEAD remains the pre-existing script:

```diff
+    "test:r4-r7-http": "tsx lib/auth/__tests__/r4-r7-http-boundary.test.ts",
```

No dependency names, versions, or classification sections were edited.

### `package-lock.json`

Regenerated solely by:

```bash
npm install --package-lock-only
```

Diff vs HEAD: 21 lines (`+10` / `-11`). Root `dependencies`, `devDependencies`, and `optionalDependencies` are unchanged.

Flag-only lockfile updates (no version / integrity / resolved change):

| Lockfile entry | Before | After |
|----------------|--------|-------|
| `node_modules/@prisma/debug` | `dev: true` | `devOptional: true` |
| `node_modules/@prisma/engines` | `dev: true` | `devOptional: true` |
| `node_modules/@prisma/engines-version` | `dev: true` | `devOptional: true` |
| `node_modules/@prisma/fetch-engine` | `dev: true` | `devOptional: true` |
| `node_modules/@prisma/get-platform` | `dev: true` | `devOptional: true` |
| `node_modules/@types/prop-types` | `dev: true` | `devOptional: true` |
| `node_modules/@types/react` | `dev: true` | `devOptional: true` |
| `node_modules/csstype` | `dev: true` | `devOptional: true` |
| `node_modules/fsevents` | `dev: true` + `optional: true` | `optional: true` only |
| `node_modules/prisma` | `dev: true` | `devOptional: true` |
| `node_modules/ws` | `dev: true` | `devOptional: true` |

Added packages: none. Removed packages: none. Version changes: none. Integrity changes: none. Resolved URL changes: none.

The lockfile was not hand-edited.

---

## Validation

Local toolchain:

| Tool | Version |
|------|---------|
| `node` | `v24.17.0` |
| `npm` | `11.13.0` |

`vercel.json` (inspected only; not modified):

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install --legacy-peer-deps",
  "outputDirectory": ".next"
}
```

| Gate | Command | Result |
|------|---------|--------|
| Clean install | `npm ci` | **PASS** (exit 0). `added 794 packages, and audited 795 packages`. `postinstall` ran `prisma generate` successfully. |
| Lint | `npm run lint` | **PASS** (exit 0) |
| TypeScript | `npx tsc --noEmit` | **PASS** (exit 0) |
| Build | `npm run build` | **PASS** (exit 0). Next.js 16.2.7 compiled successfully; 211/211 static pages generated. |
| A.8 IDOR | `npm run test:a8-idor` | **PASS** (exit 0). 13 passed, 0 failed. |
| A.8 privilege | `npm run test:a8-privilege` | **PASS** (exit 0). 27 passed, 0 failed. |
| A.8 step 5 | `npm run test:a8-step5` | **PASS** (exit 0). 27 passed, 0 failed. |
| A.8 HTTP | `npm run test:a8-http` | **PASS** (exit 0). 27 passed, 0 failed. |
| A.9 HTTP | `npm run test:a9-http` | **PASS** (exit 0). 47 passed, 0 failed. |
| R1–R3 HTTP | `npm run test:r1-r3-http` | **PASS** (exit 0). 32 passed, 0 failed. |
| Identity | `npm run test:identity` | **PASS** (exit 0). All nine identity files passed. |
| R4–R7 HTTP | `npm run test:r4-r7-http` | **PASS** (exit 0). 42 passed, 0 failed. Script was already registered in the working-tree `package.json`; it was not invented by this gate. |
| Diff whitespace | `git diff --check` | **PASS** (exit 0, no output). |

Notes on `test:a8-http`: the suite still logs a Prisma `DATABASE_URL` initialization error from the `test-db` health probe. The assertion (`test-db GET returns no user_count for anonymous`) passed; the suite exit code was 0. That is pre-existing test-environment behavior, not a lockfile failure.

`npm ci` and `npm run build` were executed after lockfile regeneration and before the security suites. The lockfile did not change after those commands, so they were not run a second time as a third cycle.

---

## Scope

This gate modified:

- `package-lock.json` (npm-generated flag metadata only)
- `docs/platform/identity/r4-r7-dependency-lockfile-fix-report.md` (this report)

This gate did **not** modify:

- application source
- Prisma schema
- Prisma migrations
- database seed files
- Neon configuration
- Vercel configuration (`vercel.json` inspected only)
- authentication / authorization code
- IAM code
- API routes
- tests
- environment files
- `.local/**`
- secrets
- generated application artifacts

No production writes, no `vercel deploy`, no `vercel --prod`, no migrations, no seed scripts, no IAM reconciliation, no commit, no push.

Pre-existing dirty R4–R7 source and docs remain in the working tree exactly as found.

---

## Remaining status

**READY FOR VERCEL REDEPLOYMENT**

Meaning of that status:

- The lockfile is now the deterministic npm output for the existing `package.json`.
- Local `npm ci` and `npm run build` succeed.
- Security regression suites listed above pass.

This is **not** a claim that the Vercel build is fixed. No new Vercel build was run in this gate. The next deployment-verification gate must actually trigger and inspect Vercel.

Observed, not remediated (out of this gate’s scope): `vercel.json` still uses `installCommand: "npm install --legacy-peer-deps"` rather than `npm ci`. That file was not changed.

Working tree remains **dirty**.
