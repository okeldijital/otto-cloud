# IAM CI/CD Workflow Preparation

## Recommended pipeline stages

```
install → typecheck/lint → unit tests → migrate (preview) → bootstrap (preview) → build → deploy
```

## GitHub Actions sketch

```yaml
# .github/workflows/iam-deploy.yml (reference — adapt to your env secrets)
name: IAM Deploy

on:
  workflow_dispatch:
    inputs:
      target:
        description: lab | preview | production
        required: true
        default: lab

jobs:
  migrate-and-bootstrap:
    runs-on: ubuntu-latest
    environment: ${{ inputs.target }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm

      - name: Install
        run: npm ci

      - name: Identity unit tests
        run: npm run test:identity && npm run test:event-contracts

      - name: Migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
        run: npx prisma migrate deploy

      - name: Bootstrap IAM
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
          INITIAL_ADMIN_EMAIL: ${{ secrets.INITIAL_ADMIN_EMAIL }}
          INITIAL_ADMIN_PASSWORD: ${{ secrets.INITIAL_ADMIN_PASSWORD }}
          INITIAL_ADMIN_NAME: ${{ secrets.INITIAL_ADMIN_NAME }}
          INITIAL_ORG_NAME: ${{ vars.INITIAL_ORG_NAME }}
          NEON_BRANCH: ${{ vars.NEON_BRANCH }}
          # production job only:
          # ALLOW_PRODUCTION_BOOTSTRAP: "true"
        run: |
          if [ "${{ inputs.target }}" = "production" ]; then
            npm run bootstrap:iam -- --allow-production
          else
            npm run bootstrap:iam
          fi

      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
          IAM_ENCRYPTION_KEY: ${{ secrets.IAM_ENCRYPTION_KEY }}
```

## Step ownership

| Step | Local | Preview env | Production |
|------|-------|-------------|------------|
| Install + unit tests | Dev / CI | CI | CI |
| `migrate deploy` | Dev (lab) | Auto on preview DB | Manual approval + gated |
| `bootstrap:iam` | Dev (lab) | First provision only | Manual approval + `--allow-production` |
| Build | Dev optional | CI / Vercel | CI / Vercel |
| Deploy app | N/A | Vercel preview | Vercel production |
| Smoke login | Dev | Optional | Required checklist |

## Secrets matrix

| Secret | Preview | Production |
|--------|---------|------------|
| `DATABASE_URL` | Preview Neon | Prod Neon |
| `DIRECT_URL` | Preview non-pooler | Prod non-pooler |
| `NEXTAUTH_SECRET` | Preview secret | Prod secret (unique) |
| `IAM_ENCRYPTION_KEY` | Preview key | Prod key (unique) |
| `INITIAL_ADMIN_*` | Lab/test admin | Break-glass admin only |

## Guardrails in CI

1. Never set `ALLOW_DESTRUCTIVE_DB_OPS` in production pipelines  
2. Production bootstrap requires environment protection rules (reviewers)  
3. Do not run `prisma migrate reset` in any workflow  
4. Fail the job if bootstrap exits non-zero  
5. Prefer `NEON_BRANCH` / environment name over guessing hosts  

## Existing CI note

Current `.github/workflows/ci.yml` still references legacy `backend/` and
`frontend/` paths. IAM automation should live in a dedicated workflow (above)
or an updated monorepo job that runs against this Next.js root.
