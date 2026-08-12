# Milestone A.7 — Cloud Runtime Stabilization & Acceptance

## Status

Implementation branch: `milestone-a7-cloud-runtime-stabilization`

A.7 stabilizes and proves the existing OTTO Cloud runtime on Vercel + Neon. It does **not** recover or recreate historical business data.

## Scope

A.7 covers:

- Vercel/Neon environment integrity
- Prisma migration integrity
- IAM bootstrap safety and idempotency
- native IAM authentication
- password lifecycle
- sessions and refresh-token lifecycle
- TOTP MFA and trusted devices
- organization membership and RBAC
- cross-organization isolation
- API authorization
- frontend authentication/runtime behavior
- Vercel deployment behavior
- Neon/serverless connection behavior
- security and secret handling
- IAM event/observability checks
- automated and deployed smoke acceptance
- operational deployment and rollback documentation

Business catalogue recovery is explicitly deferred.

## Safety boundary

No A.7 workflow may:

- run `prisma migrate reset`
- truncate or delete historical business data
- recreate the production branch
- point production at `iam-lab`
- introduce NextAuth/Auth.js
- fabricate business records
- perform historical catalogue recovery

All database changes must be Prisma migrations and must be reviewed before production execution.

## Runtime diagnostic

A read-only diagnostic is available:

```bash
npm run diagnose:cloud
```

It reports:

- database target classification
- Neon endpoint and pooler status
- `OTTO_ENV`, `NEON_BRANCH`, and `VERCEL_ENV` labels
- presence/absence of required secrets without printing values
- database connectivity
- IAM row counts
- Prisma migration history and unfinished migrations

The diagnostic performs no INSERT, UPDATE, DELETE, TRUNCATE, DROP, or ALTER operations.

## Repository acceptance checks

Run:

```bash
npm run test:a7
```

This verifies the repository-level A.7 invariants without connecting to a database.

## Cloud acceptance

The final cloud acceptance must be performed against the actual Vercel production deployment and its intended Neon production branch.

Required proof:

1. Vercel production points to the intended Neon branch.
2. `DIRECT_URL` is configured for Prisma migration operations.
3. IAM migrations are complete with no failed/unfinished migration.
4. IAM bootstrap is idempotent.
5. Valid credentials produce an authenticated session.
6. Invalid credentials are rejected.
7. Password change/reset invalidates the appropriate sessions.
8. Required MFA prevents session creation until challenge completion.
9. Organization switching and membership checks enforce active membership.
10. RBAC is enforced server-side.
11. Cross-organization access is rejected.
12. Logout and logout-all invalidate sessions as designed.
13. Frontend reload retains the correct authenticated state.
14. Vercel runtime has no connection exhaustion or authentication redirect loop.
15. No credentials or tokens are exposed in logs or responses.

## Acceptance matrix

| Area | Required result |
|---|---|
| Environment | PASS |
| Database | PASS |
| IAM bootstrap | PASS |
| Login | PASS |
| Password lifecycle | PASS |
| Sessions | PASS |
| MFA | PASS |
| Organizations | PASS |
| RBAC | PASS |
| Cross-org isolation | PASS |
| API authorization | PASS |
| Frontend runtime | PASS |
| Vercel deployment | PASS |
| Security | PASS |
| Observability | PASS |
| E2E smoke | PASS |
| Rollback | Documented |
| Business-data recovery | Deferred |

The milestone cannot be declared production-ready while a critical or high authentication, authorization, database-integrity, or deployment defect remains.

## Deferred work

Historical business-data recovery remains a separate milestone. The current cloud application may legitimately contain an empty catalogue while A.7 is completed.
