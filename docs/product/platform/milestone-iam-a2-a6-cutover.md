# Platform IAM A.2–A.6 + NextAuth Cutover

| Field | Value |
|-------|--------|
| Status | Implemented |
| Date | 2026-07-28 |
| Prior | [A.1 Authentication](./milestone-iam-a1-complete.md) |

---

## A.2 — Password Management

| Item | Detail |
|------|--------|
| Change password | `POST /api/auth/password/change` |
| Forgot password | `POST /api/auth/password/forgot` |
| Reset password | `POST /api/auth/password/reset` |
| UI | `/auth/forgot-password`, `/auth/reset-password`, Settings → Security |
| Controls | Argon2id, history (5), single-use hashed tokens, revoke other sessions |
| Events | `identity.password.changed`, `reset.requested`, `reset.completed` |

## A.3 — Session Management

| Item | Detail |
|------|--------|
| List | `GET /api/auth/sessions` |
| Revoke one | `DELETE /api/auth/sessions/[id]` |
| Revoke others | `DELETE /api/auth/sessions` |
| UI | `/settings/security` |

## A.4 — TOTP MFA

| Item | Detail |
|------|--------|
| Enroll | `POST /api/auth/mfa/enroll` + `/confirm` |
| Challenge | Login returns `mfaToken`; complete via `POST /api/auth/mfa/challenge` |
| Disable | `POST /api/auth/mfa/disable` |
| Recovery codes | Issued on enroll (hashed, single-use) |
| Trusted device | `otto_td` cookie |
| Crypto | Pure TOTP (RFC 6238) + AES-GCM secret box |

## A.5 / A.6 — Organizations & RBAC

| Item | Detail |
|------|--------|
| Create / list orgs | `GET/POST /api/auth/organizations` |
| Switch org | `POST /api/auth/organizations/switch` |
| Members | `GET/POST /api/auth/organizations/members` |
| Roles | `org_admin`, `member`, `viewer` via `seedOrgSystemRoles` |
| Enforcement | `requirePermission`, `requireOrganization` middleware |
| Catalog | `PERMISSION_CATALOG` |

## Legacy cutover + NextAuth removal

| Action | Status |
|--------|--------|
| `getServerSession` → `@/lib/auth/session` (IAM cookies) | Done |
| Remove `next-auth` package | Done |
| Delete `app/api/auth/[...nextauth]` | Done |
| AuthContext / OrgContext / Providers | IAM only |
| Register → IAM identity | Done |
| Migration script | `npm run migrate:legacy-auth` |

### Migrate legacy users

```bash
# All active users (passwords randomized → force reset)
npm run migrate:legacy-auth

# Single user with known password
npx tsx scripts/migrate-legacy-auth.ts --user-id=1 --password='TempPassw0rd!'
```

---

## Tests

```bash
npm run test:identity
```

## Not yet (later milestones)

- A.7 Invitations UI  
- A.8–A.10 Security center polish / audit console  
- Production email delivery for reset / verification  
- Full rewrite of every business route to `requirePermission` keys (compat bridge in place)
