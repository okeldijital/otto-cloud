# IAM Deployment Workflow

## Standard sequence (clean database)

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env.local
# Set DATABASE_URL, DIRECT_URL, secrets, INITIAL_ADMIN_*
# For lab: NEON_BRANCH=iam-lab

# 3. Migrations (schema only — never reset production)
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"
npx prisma migrate deploy

# 4. Bootstrap IAM (idempotent)
npm run bootstrap:iam

# 5. Run app
npm run dev

# 6. Smoke
# - open /auth/login
# - sign in with INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD
# - confirm dashboard loads with org context
# - logout
```

## Environment setup checklist

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Prefer Neon pooler for app |
| `DIRECT_URL` | Yes | Non-pooler for migrations |
| `NEXTAUTH_SECRET` | Yes | ≥32 random bytes |
| `IAM_ENCRYPTION_KEY` | Prod yes | 32-byte key |
| `INITIAL_ADMIN_EMAIL` | Bootstrap | |
| `INITIAL_ADMIN_PASSWORD` | Bootstrap | Meets password policy |
| `NEON_BRANCH` | Lab | `iam-lab` |

## Where steps run

| Step | Local | Preview | Production |
|------|-------|---------|------------|
| `npm install` | Yes | CI / Vercel | CI / Vercel |
| `prisma migrate deploy` | Yes | Preview DB | Production DB (controlled) |
| `bootstrap:iam` | Yes (lab) | Optional first deploy | **Once** with override |
| `npm run dev` | Yes | No | No |
| `npm run build && start` | Optional | Yes | Yes |
| Identity unit tests | Yes / CI | CI | CI |
| Smoke login | Manual | Optional | Post-deploy checklist |

## Smoke tests

```bash
# Automated unit (no DB required for most)
npm run test:identity
npm run test:event-contracts
npm run test:platform-events

# Bootstrap re-run (must exit 0, no duplicates)
npm run bootstrap:iam

# Manual
# 1. Login success
# 2. Login failure (wrong password) — no validation warnings in logs
# 3. Session / dashboard
# 4. Logout
```

## Rollback considerations

| Change | Rollback |
|--------|----------|
| Prisma migrations | Forward-fix preferred; restore DB snapshot for hard rollback |
| Bootstrap data | Non-destructive; delete org/identity only via controlled ops |
| App deploy | Redeploy previous release (Vercel) |
| Encryption key rotation | Not automated in v1 — keep old key until MFA re-enroll plan |

**Never** run `prisma migrate reset` against production.

## Safety

```bash
# Blocked by default on production-classified targets
npm run bootstrap:iam

# Explicit override (document who/when)
ALLOW_PRODUCTION_BOOTSTRAP=true npm run bootstrap:iam -- --allow-production
```

## Recovery of production database

1. Restore Postgres from backup / Neon point-in-time  
2. `prisma migrate deploy` (if migration history incomplete, reconcile carefully)  
3. `bootstrap:iam` only if IAM rows are empty — otherwise use targeted recovery  
4. Verify login + RBAC before traffic  
