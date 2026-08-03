# IAM Deployment (v1.0)

## Required environment

See **`.env.example`** for the full classified list.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres with `iam_*` migrations applied (pooler OK for app) |
| `DIRECT_URL` | Non-pooler URL for Prisma migrations |
| `NEXTAUTH_SECRET` | Session / secret bridge |
| `IAM_ENCRYPTION_KEY` | AES-GCM MFA secrets (32-byte hex/base64) — **required in production** |
| `IAM_ACCESS_TOKEN_SECRET` | Access token HMAC (optional; falls back to encryption key) |
| `INITIAL_ADMIN_*` | Bootstrap admin credentials |
| `NEON_BRANCH` | Set `iam-lab` for lab; used by safety classification |

## Migrations

```bash
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"
npx prisma migrate deploy
```

Includes IAM foundation through A.5 (`iam_identity_platform` … `iam_a5_org_rbac`).

**Never** run `prisma migrate reset` against production.

## Post-deploy (canonical)

```bash
npm run bootstrap:iam   # idempotent; no demo data
npm run dev             # or build/start in production
# login at /auth/login
```

Optional for legacy desktop users:

1. Migrate users: `npm run migrate:legacy-auth:report -- --migrate`  
2. Verify: `GET /api/platform/health/identity`  

## Related docs

- [Bootstrap architecture](./bootstrap.md)
- [Deployment workflow](./deployment-workflow.md)
- [CI/CD preparation](./cicd-workflow.md)
- [Org create hang RCA](./rca-organization-create-hang.md)
- [Event validation report](./event-validation-report.md)
- [Production readiness](./production-readiness.md)

## Scaling notes

- Rate limits are in-process — use Redis for multi-instance  
- Permission cache is in-process — same caveat  
