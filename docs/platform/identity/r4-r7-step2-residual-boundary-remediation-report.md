# R4–R7 Step 2 — Residual Boundary Remediation Report

## Status

**IMPLEMENTATION COMPLETE — VALIDATION PENDING**

Implementation is isolated on branch `security/r4-r7-residual-boundary-remediation` and PR #5. No production, Neon, Vercel deployment promotion, migration, IAM reconciliation, or production data writes were performed by this gate.

## R4 — IAM role-name oracle

- Replaced the global `roles.findUnique({ name })` preflight with an organization-bound lookup.
- Ordinary organization actors cannot select an arbitrary organization; the organization is session-derived.
- Database uniqueness conflicts are mapped to the same generic `Role name unavailable` response.
- Existing system-role mutation protections remain intact.

## R5 — AI entity references

Added `requireAIEntityInOrg` as a strict AI-specific ownership guard. Supported references are resolved through the canonical A.8/A.9 resource helpers; documents are explicitly organization-scoped; unsupported entity types fail closed.

Applied to:

- `ai/contracts?action=resolve`
- `ai/core-write?action=propose`
- `ai/release-integration?action=plan`
- `ai/release-integration?action=attach`

Run/release/contract/document ids also use fail-closed positive integer validation.

## R6 — coercion remnants

- `/api/search` now uses `requireLegacyIntOrgId` for legacy INT organization surfaces.
- `lib/reports.ts` no longer uses `Number(orgId) || orgId`; contracts use the strict legacy INT scope while UUID-owned reports use the UUID directly.
- `lib/ai-audit.ts` applies the same strict split.
- No fallback organization value is invented by these paths.

## R7 — generated artifacts

No generated artifacts, environment files, migrations, or production operational files were intentionally added to the remediation branch.

## Regression gate

Added `npm run test:r4-r7-http` with source-level and canonical-helper regression contracts covering R4–R7.

## Validation state

GitHub status currently reports:

- CodeRabbit: **success**
- Vercel: **pending**

No claim is made that lint, TypeScript, build, or the full historical regression matrix has passed until those checks are actually available through GitHub.

## Production safety

- Neon writes: **none**
- IAM writes: **none**
- Migrations: **none**
- Production deployment/promotion: **none**
- Production data changes: **none**

## Next gate

Do not merge PR #5 until the validation/readiness review has independently confirmed the diff, test suite, and package-tree hygiene.
