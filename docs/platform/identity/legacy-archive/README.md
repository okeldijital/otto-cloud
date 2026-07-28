# Legacy authentication archive

**Status:** Removed — see A.4.5 [legacy-removal.md](../legacy-removal.md) and [ADR-032](../../../product/platform/adr-032-iam-cutover.md)

## What was here

| Surface | Former role |
|---------|-------------|
| `next-auth` package | Credentials + JWT sessions |
| `app/api/auth/[...nextauth]` | NextAuth route handler |
| `lib/auth.ts` authOptions | Credentials provider |
| Dual-run `LEGACY_AUTH_REQUIRED` | A.1 bridge for unmigrated users |

## Replacement

| Concern | Now |
|---------|-----|
| Session | IAM HttpOnly cookies + `CurrentIdentityService` |
| Login | `POST /api/auth/login` |
| Server session | `getServerSession()` from `@/lib/auth/session` |
| Permissions | IAM `PermissionSet` + membership roles |
| Legacy users | `npm run migrate:legacy-auth` |

## Migration notes

1. Run `npx prisma migrate deploy` for `iam_*` tables.  
2. Run `npm run migrate:legacy-auth` (or per-user with `--password=`).  
3. Randomized passwords require `/auth/forgot-password` unless password was set at migrate.  
4. `legacyUserId` on `iam_identities` bridges INT-scoped tables until data migration finishes.

Do not reintroduce NextAuth.
