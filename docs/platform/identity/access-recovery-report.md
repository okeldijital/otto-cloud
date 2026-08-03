# OTTO Cloud Access Recovery Investigation

**Generated:** 2026-08-03T14:50:00Z  
**Target:** Neon `ep-flat-moon-appwkffr` / project `plain-tree-50826299`  
**Rules observed:** Investigation-first; recovery via supported utility only; IAM not disabled; no manual hash/SQL edits.

---

## Executive Summary

Administrator login failed after the IAM upgrade because authentication is **IAM-only** (NextAuth removed) while the operator’s known credentials belonged to the **legacy** `users` table (different email + bcrypt password).

| Layer | Administrator |
|-------|----------------|
| Legacy `users` | `nkosilekot@gmail.com` · bcrypt · role admin |
| IAM identity | `admin@otto.com` · Argon2id · status active · owner of **OTTO Lab** |

Login looks up **only** `iam_identities.emailNormalized`. Using the legacy email yields `INVALID_CREDENTIALS` (unknown identity). Using `admin@otto.com` with the old bcrypt password fails Argon2 verification.

**Recovery:** Supported utility `scripts/reset-iam-password.ts` set a new Argon2id password for `admin@otto.com`.  
**Verification:** Login, session cookies, RBAC (owner, 43 perms), org load, and logout all succeeded via `AuthenticationService`.  
**Data:** Environment contains **laboratory data only** (no artists/contracts/releases/etc.).

### Conclusion

# ACCESS RESTORED — FURTHER REMEDIATION REQUIRED

| | |
|--|--|
| **Confidence** | **High** |
| **Evidence** | Service-level login + cookie session + logout verified; empty business tables confirmed |
| **Remaining blockers** | No production business data on this DB; UI smoke against running `npm run dev` not run in this session; temporary recovery password should be rotated by operator |

---

## 1. Authentication Flow Analysis

### Login path (current architecture)

```
POST /api/auth/login  (app/api/auth/login/route.ts)
  → authenticationService.login()
      1. Validate email/password non-empty
      2. rateLimitService.assertLogin
      3. normalizeEmail → iamIdentity.findUnique({ emailNormalized })
         ✗ missing → recordUnknownFailure → 401 INVALID_CREDENTIALS
      4. lockoutService.maybeAutoUnlock / isLocked
         ✗ locked → 403 ACCOUNT_LOCKED
      5. status === disabled → 403 ACCOUNT_DISABLED
      6. passwordCreds[0] required
         ✗ none → 401 INVALID_CREDENTIALS
      7. verifyPassword(plain, argon2id hash)   ← failure point for wrong/legacy password
         ✗ fail → recordFailure → 401 INVALID_CREDENTIALS
      8. lockoutService.recordSuccess
      9. credentialLifecycleService.checkLoginPasswordGate
     10. buildLoginProfile (org membership + roles + permissions)
     11. MFA gate (if enrolled & required) → nextStep mfa_required, no session
     12. sessionService.createSession → session + refresh + access tokens
     13. emit identity.login.success
     14. nextStep: authenticated | password_reset_required | email_verification_required
  → cookieService.applyAuthCookies (otto_sid, otto_rid, otto_at)
```

### Failure point for this incident

| Attempt | Result | Stage |
|---------|--------|--------|
| Login as `nkosilekot@gmail.com` + any password | No IAM identity | Step 3 |
| Login as `admin@otto.com` + legacy bcrypt password | Argon2 verify fails | Step 7 |
| Login as `admin@otto.com` + unknown lab password | Argon2 verify fails | Step 7 |

**Not the failure points:** account lock, disabled status, missing credential row, MFA, email verification (identity is verified), missing membership.

### Session / JWT / RBAC (post-success)

| Component | Implementation |
|-----------|----------------|
| Session | `sessionService.createSession` → `iam_sessions` + device |
| Access token | HMAC access token (cookie `otto_at`) |
| Refresh token | `iam_refresh_tokens` (cookie `otto_rid`) |
| Session token | opaque session id cookie `otto_sid` |
| Organization | Default membership org (`otto-lab`) |
| RBAC | Role `owner` → 43 catalog permissions resolved |

---

## 2. Administrator Account Analysis

### Legacy user

| Field | Value |
|-------|--------|
| id | 1 |
| email | `nkosilekot@gmail.com` |
| name | Lab Administrator |
| role | admin |
| is_active | true |
| is_superuser | true |
| password | bcrypt `$2b$10$…` (present) |
| last_login | null |
| tenant_id | `be14a1c0-34ff-49cb-b893-55647463b99e` |

### IAM identity

| Field | Value |
|-------|--------|
| id | `92153a28-f5c9-45ae-a424-45e72ca8256f` |
| email | `admin@otto.com` |
| status | **active** |
| emailVerifiedAt | set (2026-07-29) |
| lockedUntil | null |
| failedLoginCount | 0 (at inspection) |
| mustChangePassword | false |
| sessionVersion | 0 (pre-reset) |
| legacyUserId | **1** (linked to legacy user) |
| displayName | Lab Administrator |
| lastLoginAt | 2026-07-29 (prior lab success) |

### Membership / RBAC

| Field | Value |
|-------|--------|
| membership status | active |
| isOwner | true |
| isDefault | true |
| organization | **OTTO Lab** / `otto-lab` |
| role | **owner** |
| permission count | 43 |

### Consistency verdict

| Check | Status |
|-------|--------|
| IAM identity complete | Yes |
| Password credential present | Yes (Argon2id) |
| Org membership + owner role | Yes |
| Legacy linkage (`legacyUserId=1`) | Yes |
| Email alignment with legacy | **No** — different emails |
| Password shared with legacy | **No** — bcrypt vs Argon2id, independent hashes |

Account is **internally consistent as an IAM lab admin**, but **not aligned** with the legacy operator email/password the user likely tries.

---

## 3. Credential Analysis

| Question | Answer |
|----------|--------|
| Was admin password migrated from legacy bcrypt? | **No.** IAM hash is Argon2id created 2026-07-29 lab bootstrap; not a rehash of legacy bcrypt. |
| Was a random password generated? | Likely during original lab identity creation / migration linkage — operator no longer has a working secret. |
| Was reset required? | `mustChangePassword=false`; no forced gate — problem is unknown password + email mismatch. |
| Credential exists? | Yes — type `password`, primary, not disabled. |
| Algorithm | argon2id |
| MFA | None enrolled |
| Locked? | No |
| Disabled? | No |
| First-login gate? | No |

Historical evidence: successful logins as `admin@otto.com` on 2026-07-29 and one `invalid_credentials` attempt the same day — password was known then, not now.

---

## 4. Recovery Method Used

### Options considered

| Method | Used? | Notes |
|--------|-------|--------|
| Forgot-password email flow | No | Requires app + email delivery; ops utility faster for lab |
| Manual SQL hash update | **Forbidden** | Not used |
| Disable IAM / bypass auth | **Forbidden** | Not used |
| **`scripts/reset-iam-password.ts`** | **Yes** | Supported IAM utility (Argon2id via `@node-rs/argon2`) |
| Bootstrap `--reset-admin-password` | No | Destructive flag path; dedicated reset script is cleaner |

### Command executed

```
# 2026-08-03T14:47:57Z
npx tsx scripts/reset-iam-password.ts \
  --email admin@otto.com \
  --password '***'
```

**Effects (supported):**

- Updates/creates `iam_password_credentials` Argon2id hash  
- Clears lockout counters  
- Clears `mustChangePassword`  
- Bumps `sessionVersion`  
- Revokes existing sessions/refresh tokens  

**Did not:** touch business tables, weaken auth, edit raw SQL, change application code.

### Credentials for operator

| Field | Value |
|-------|--------|
| Email (must use this) | `admin@otto.com` |
| Temporary password | *(issued to operator at recovery time; rotate after use — not stored in git)* |
| Login URL | `/auth/login` |

**Rotate this password after use** (change-password UI or re-run reset script).

**Do not** log in as `nkosilekot@gmail.com` — there is no IAM identity for that email.

---

## 5. Login Verification Results

| Test | Result |
|------|--------|
| Wrong password → 401 INVALID_CREDENTIALS | Pass |
| Correct password → nextStep `authenticated` | Pass |
| Session created | Pass |
| Access + refresh + session tokens issued | Pass |
| Organization loaded (`otto-lab`) | Pass |
| Roles `owner` | Pass |
| Permissions count 43 | Pass |
| MFA not required | Pass |
| Email verification not blocking | Pass |
| Cookie jar `otto_sid` / `otto_rid` / `otto_at` | Pass |
| `getPublicSession` authenticated with cookies | Pass |
| `authenticationService.logout` | Pass |
| Session unauthenticated after logout | Pass |
| Legacy email login rejected | Pass (expected) |

**Warnings:**

1. Browser UI smoke (`npm run dev` + dashboard) not executed in this investigation — service layer fully verified.  
2. First harness logout used wrong `revokeSession` call shape (test bug only); production API path `authenticationService.logout` works.  
3. Recovery password is temporary and should be rotated.

---

## 6. Cloud Data Inventory

| Entity | Count |
|--------|------:|
| artists | 0 |
| releases | 0 |
| tracks | 0 |
| works | 0 |
| contracts | 0 |
| attachments | 0 |
| labels | 0 |
| royalty_entitlements | 0 |
| api_keys | 0 |
| audit_logs | 0 |
| organizations (legacy) | 0 |
| users (legacy) | 1 |
| tenants | 1 |
| tenant_users | 0 |
| iam_identities | 1 |
| iam_organizations | 1 |
| iam_organization_memberships | 1 |
| platform_events | 16+ |
| notifications table | missing / N/A |

DB size context (prior baseline): **~21 MB**.

---

## 7. Environment Classification

# C. Laboratory data only

**Evidence:**

- Org named **OTTO Lab** / slug `otto-lab`  
- Zero business catalog rows  
- Single lab admin identity  
- Matches prior iam-lab engineering validation endpoint  
- Not a recovered production dataset  

---

## 8. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Operator continues using legacy email | High (access UX) | Document IAM email; optionally create identity alias later |
| Temporary password leakage | Medium | Rotate immediately after first login |
| Belief that this DB is production | Critical | Classification C — empty lab |
| No production data to validate next phase | High | Need recovered production branch or desktop migration |

---

## 9. Recommendations

1. **Sign in** at `/auth/login` with `admin@otto.com` + temporary password above; change password.  
2. **Do not** treat this environment as production data — classification **C**.  
3. **Next engineering step:** **Recover production database** (Neon branch / PITR restore) **or** **migrate desktop data** into a clean environment — then re-run production rehearsal.  
4. Optionally align emails: create IAM identity for `nkosilekot@gmail.com` via supported invite/register/migrate path (not raw SQL).  
5. Continue production rehearsal only after a non-empty recovered dataset exists.

**Recommended outcome:** **Recover production database** (primary) · desktop migrate if no cloud prod exists.

---

## Final Conclusion

# ACCESS RESTORED — FURTHER REMEDIATION REQUIRED

| Attribute | Value |
|-----------|--------|
| **Confidence** | **High** |
| **Evidence** | Root cause (email + credential split) confirmed; `reset-iam-password` applied; AuthenticationService login/session/logout verified; empty business inventory |
| **Remaining blockers** | No production business data on this cloud DB; operator must use `admin@otto.com`; rotate temp password; full browser dashboard smoke recommended |

Access to the **cloud application’s IAM admin** is restored for the **lab** environment. Access does **not** unlock production business data because that data is not present here.
