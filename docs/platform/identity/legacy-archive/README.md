# Legacy Authentication — Archive Notice

**Status:** Active in production until IAM cutover  
**Policy:** Do **not** retrofit. Build new IAM under `lib/platform/identity/`.

## Legacy surface (frozen design)

| Path | Role |
|------|------|
| `lib/auth.ts` | NextAuth credentials + JWT session claims |
| `lib/auth/*` | Organization context (catalog tenancy) |
| `lib/iam.ts` | Legacy IAM helpers |
| `lib/permissions.ts` | Role-string admin checks |
| `app/api/auth/*` | NextAuth + register/login helpers |
| `prisma` model `User` / `users` | Legacy user table |
| `tenant_users`, `invitations`, `roles` | Legacy org membership |

## Why not migrate in place

Authentication debt compounds: mixed org models, bcrypt hashes, JWT-only sessions, role strings.  
Retrofitting is more expensive than a parallel identity platform.

## Cutover plan

1. Deploy `iam_*` schema alongside legacy tables (A.0).  
2. Implement login against IAM (A.1+) without removing next-auth.  
3. Admin import tool: Argon2-compatible users or force password reset.  
4. Verify dual-run.  
5. Later milestone: remove next-auth and legacy auth tables.

## Bridge field

`iam_identities.legacyUserId` optionally maps to `users.id` during dual-run.
