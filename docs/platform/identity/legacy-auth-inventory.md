# Legacy Authentication Inventory (A.4.5)

| Field | Value |
|-------|--------|
| Status | Inventory complete — NextAuth removed at cutover |
| Date | 2026-07-28 |

## Guiding rule

**One platform owns authentication.** NextAuth/Auth.js must not remain as a parallel provider.

---

## Inventory

| File / surface | Purpose | Replacement | Removal plan |
|----------------|---------|-------------|--------------|
| `next-auth` npm package | Session/JWT provider | IAM cookies + SessionService | **Removed** from package.json |
| `app/api/auth/[...nextauth]` | NextAuth route handler | `/api/auth/login`, `/session`, `/logout`, `/refresh` | **Deleted** |
| `lib/auth.ts` authOptions | Credentials provider config | `@/lib/auth/session` + IAM services | **Stub removed** (A.4.5) |
| `getServerSession(authOptions)` | Server session | `getServerSession()` from `@/lib/auth/session` (IAM) | Migrated |
| `useSession` / `SessionProvider` (next-auth/react) | Client session | `AuthContext` + `GET /api/auth/session` | Migrated |
| `contexts/SessionContext.tsx` | Dead localStorage fake session | AuthContext (IAM) | **Rewritten / deprecated** |
| `NEXTAUTH_URL` | Base URL for links | `NEXT_PUBLIC_URL` / `APP_URL` | Prefer non-NEXTAUTH envs; keep as fallback only |
| `NEXTAUTH_SECRET` | JWT/signing secret | `IAM_ENCRYPTION_KEY` / `IAM_ACCESS_TOKEN_SECRET` | Dev fallback only until secrets rotated |
| `users.hashed_password` (bcrypt) | Legacy password store | `iam_password_credentials` (Argon2id) | Migrate via `migrate-legacy-auth` |
| `users` / `tenant_users` | User + org membership (data) | IAM identity + membership; tables remain for catalog/business bridge | **Not dropped** — business data still references them |
| Dual-run `LEGACY_AUTH_REQUIRED` | Bridge unmigrated users | Full IAM-only login | **Removed** from login path |

## Confirmed absent

- No `next-auth` dependency in `package.json`
- No `[...nextauth]` route
- No `SessionProvider` from `next-auth/react` in `app/providers.tsx`

## Remaining (non-auth) dual-write

| Surface | Why it remains |
|---------|----------------|
| `prisma.user` / `tenant_users` | Catalog, org membership, admin UI until data-domain migration |
| `legacyUserId` on `iam_identities` | Bridge INT-scoped tables |
| `legacyTenantId` on `iam_organizations` | Catalog org mapping |

These are **data bridges**, not authentication providers.

## Environment variables

| Variable | Status |
|----------|--------|
| `NEXTAUTH_SECRET` | Deprecated — use `IAM_ENCRYPTION_KEY` |
| `NEXTAUTH_URL` | Deprecated — use `APP_URL` / `NEXT_PUBLIC_URL` |
| `FEATURE_LEGACY_NEXT_AUTH` | Forced `false` in feature flags |
| `FEATURE_IAM_NATIVE_AUTH` | Default `true` |

## Replacement authentication stack

```
Client → POST /api/auth/login → AuthenticationService
       → SessionService → CookieService
       → GET /api/auth/session → AuthContext

API    → requireAuthentication / requirePermission
       → AuthenticationContext / CurrentIdentityService
```
