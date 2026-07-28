# Legacy Authentication Removal

## Removed

| Artifact | Status |
|----------|--------|
| `next-auth` package | Removed from dependencies |
| `app/api/auth/[...nextauth]` | Deleted |
| NextAuth `SessionProvider` / `useSession` / `signIn` / `signOut` | Removed from app shell |
| `authOptions` credentials provider | Removed |
| Dual-run `LEGACY_AUTH_REQUIRED` login path | Removed |
| Dead `SessionContext` localStorage auth | Replaced with AuthContext re-export |

## Kept intentionally

| Artifact | Reason |
|----------|--------|
| `users` table | Business/catalog data; linked via `legacyUserId` |
| `tenant_users` | Org membership bridge |
| `NEXTAUTH_SECRET` env fallback | Dev encryption key bridge only |
| `NEXTAUTH_URL` env fallback | Base URL for email links |

## How to finish data deprecation later

1. Run `npm run migrate:legacy-auth:report -- --migrate`  
2. Force password reset for randomized passwords  
3. Stop writing to `users.hashed_password`  
4. Migrate business FKs off `users.id`  
5. Drop auth columns / freeze table in a dedicated data milestone  
