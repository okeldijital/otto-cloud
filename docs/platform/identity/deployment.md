# IAM Deployment (v1.0)

## Required environment

| Variable | Purpose |
|----------|---------|
| `IAM_ENCRYPTION_KEY` | AES-GCM MFA secrets (32-byte hex/base64) |
| `IAM_ACCESS_TOKEN_SECRET` | Access token HMAC (optional; falls back to encryption key) |
| `DATABASE_URL` | Postgres with `iam_*` migrations applied |

## Migrations

```bash
npx prisma migrate deploy
```

Includes IAM foundation through A.5 (`iam_identity_platform` … `iam_a5_org_rbac`).

## Post-deploy

1. Seed permissions/roles for orgs: `seedOrgSystemRoles(orgId)`  
2. Migrate users: `npm run migrate:legacy-auth:report -- --migrate`  
3. Verify: `GET /api/platform/health/identity`  
4. Confirm login at `/auth/login`  

## Scaling notes

- Rate limits are in-process — use Redis for multi-instance  
- Permission cache is in-process — same caveat  
