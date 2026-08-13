# R1–R3 Step 2 — Residual Authorization Remediation

## Verdict

**IMPLEMENTATION COMPLETE — validation pending local execution.**

Implementation is isolated on `security/r1-r3-residual-boundaries`, based on A.9 `2a2ecfdd7b44b61e90c2d50e40325d82b6cae512`.

No production Neon writes, migrations, IAM reconciliation, Vercel operations, or deployment were performed.

## R1 — Royalties

- `GET /api/royalties?id=...` now resolves through `requireRoyaltyInOrg`.
- `validate-splits` resolves the contract through `requireContractInOrg`.
- Validation royalty aggregation intersects entity links with `royaltyOrgScopeWhere(ctx)`.
- Empty link sets return no rows instead of a global query.
- Royalty/report/AI-audit reads are organization-bound.
- Malformed numeric IDs fail closed through `requirePositiveIntId`.

## R2 — Office Activities

The existing Prisma relationship `activities.user_id → users.id` provides the authoritative tenant boundary through `users.organization_id`; no schema change was required.

- Activity list and by-ID reads are scoped through the related user organization.
- Filters remain subordinate to the organization predicate.
- `activity_log` reports use the same organization relationship.

## R3 — Audit Logs

- By-ID reads use `requireAuditLogInOrg`.
- List reads use server-derived integer organization scope plus the existing UUID `tenant_id` where present.
- The previous `parseInt(UUID) || null` behavior is removed.
- Malformed identifiers fail with validation rather than becoming a global query.

## Indirect bypass surfaces

- `/api/reports` report creation uses the authenticated actor ID without a `|| 1` fallback.
- Report-run deletion verifies organization ownership before deletion.
- Report data retrieval requires an organization-owned report run and validates the run ID.
- `/api/ai/audit` resolution uses the authenticated actor ID without fallback and validates entity IDs.
- AI royalty anomaly scans and catalog track scans are organization-bound.

## Tests

Added `lib/auth/__tests__/r1-r3-http-boundary.test.ts` and registered `npm run test:r1-r3-http`.

The suite covers own/foreign royalty access, linked ownership, malformed IDs, contract isolation, activity list/by-ID isolation, audit-log integer/UUID isolation, report-run isolation, report royalty isolation, AI audit isolation, and track-report isolation.

## Validation

This implementation environment does not expose a local checkout/runtime, so lint, TypeScript, build, and regression-test results have **not** been fabricated.

Required before merge/deploy:

```text
npm run lint
npx tsc --noEmit
npm run build
npm run test:a8-idor
npm run test:a8-privilege
npm run test:a8-step5
npm run test:a8-http
npm run test:a9-http
npm run test:r1-r3-http
npm run test:identity
git diff --check
```

## Safety

- Neon: untouched.
- IAM: untouched.
- Migrations: none.
- Vercel/deploy: untouched.
- `main`: untouched; implementation is branch-only.

## Next gate

Run the complete validation suite and a read-only security regression review before merging this branch to `main` or deploying.