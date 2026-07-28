# User Migration Guide (Legacy → IAM)

## Prerequisites

```bash
npx prisma migrate deploy
# set IAM_ENCRYPTION_KEY in production
```

## Report (dry)

```bash
npm run migrate:legacy-auth:report
```

## Migrate all active users

```bash
npm run migrate:legacy-auth
# or
npx tsx scripts/migrate-legacy-auth-report.ts --migrate
```

## Single user with known password

```bash
npx tsx scripts/migrate-legacy-auth.ts --user-id=1 --password='TempPassw0rd!'
```

## Rules

| Case | Behavior |
|------|----------|
| Plain password provided | Argon2id stored on IAM |
| No plain password | Random Argon2id → **forced reset** via `/auth/forgot-password` |
| Email already on IAM | Link `legacyUserId` only |
| Tenant memberships | Mapped to `iam_organizations` + roles |

## Verification

1. User logs in at `/auth/login`  
2. Session appears in `/settings/security/sessions`  
3. `GET /api/auth/session` returns `authenticated: true`  
4. No NextAuth cookies required  

## Report fields

- `legacyUserCount`  
- `iamIdentityCount`  
- `linkedLegacyUserCount`  
- `unmigratedActiveUsers`  
- `migrateRun` summary  
