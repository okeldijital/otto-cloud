# OTTO Production Rehearsal — Planning & Execution Report

**Document status:** Planning complete · **Phase 13 execution: STOPPED**  
**Generated:** 2026-08-03T14:04:00Z  
**Operator:** automated rehearsal analysis (Grok Build)  
**Absolute rule observed:** Production was not modified. No recovered production branch was available to execute against.

---

## Executive Summary

### Mission

Demonstrate that an **existing OTTO production database** can be upgraded safely to the IAM platform **without data loss**, via rehearsal on a **recovered copy only**.

### Outcome of this assignment

| Phase | Status |
|-------|--------|
| 1 Environment verification | **Completed** |
| 2 Snapshot of *connected* DB | **Completed** (connected target is **iam-lab-class**, not recovered production) |
| 3–5 Migration / risk / dry-run analysis | **Completed** (offline + against connected target) |
| 6–8 Bootstrap / auth migration / business data | **Completed** (analysis only) |
| 9–11 Deploy sequence / rollback / monitoring | **Completed** (documented) |
| 12 Readiness | **Completed** |
| 13 Execute rehearsal on recovered production branch | **STOPPED — blocker** |

### Primary blocker

**No verified recovered production Neon branch connection is configured in this environment.**

The only `DATABASE_URL` present (`.env.local`) points at:

| Field | Value |
|-------|--------|
| Project | `plain-tree-50826299` |
| Endpoint | `ep-flat-moon-appwkffr` (pooler) |
| Database | `neondb` |
| Neon branch name (`neon.branch_name`) | **null** (not exposed) |
| DB size | **21 MB** |
| Business data | **Effectively empty** (0 artists, contracts, releases, tracks, works, attachments) |
| IAM | Lab bootstrap state (`admin@otto.com`, org `OTTO Lab`) |

This matches the prior **iam-lab** engineering validation environment, **not** a restored production dataset.

Therefore Phase 13 (migrate / bootstrap / smoke on recovered production) was **not executed**. Executing “rehearsal” against this empty lab database would **not** satisfy the mission success criteria (no production data to protect, no real migration delta, no business integrity proof).

### Conclusion

# NOT READY FOR PRODUCTION

**Confidence:** **High**  
**Reason:** Rehearsal cannot be claimed complete without a recovered production copy. Engineering validation on iam-lab remains valid; production cutover is **not** cleared.

**Evidence:**

1. No separate recovered-production `DATABASE_URL` / Neon branch credentials provided.  
2. Connected DB fingerprint shows empty business tables.  
3. Phase 13 stopped per absolute rules and success criteria.  

**Assumptions still requiring validation (when recovered branch exists):**

- Production `_prisma_migrations` history matches or is a known subset of repo migrations.  
- Checksums of applied migrations match disk.  
- Legacy user counts, tenant mapping, and password cutover volume are acceptable.  
- Downtime / lock behavior on full production-sized tables is within window.

---

## 1. Environment Verification

### Recorded command log (Phase 1)

```
# Timestamp: 2026-08-03T13:59:32Z (start) / 2026-08-03T14:04:00Z (migrate status)
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git log -1 --oneline
git status -sb
node -v
npm -v
npx prisma -v
npx prisma migrate status
# + read-only SQL baseline (see Phase 2)
```

### Values recorded

| Item | Value |
|------|--------|
| Git branch | `main` |
| Commit | `b780d345678321e25172a634178cba57ba32b6a7` |
| HEAD message | `fix(iam): map MembershipDto fields in org members API` |
| Working tree | Dirty — IAM hardening uncommitted (bootstrap, docs, event fix, etc.) |
| Node | `v24.17.0` |
| npm | `11.13.0` |
| Prisma CLI / Client | `5.22.0` |
| Prisma engines hash | `605197351a3c8bdd595af2d2a9bc3025bca48ea2` |
| OS | macOS (darwin x64 host tooling) |
| `DATABASE_URL` host | `ep-flat-moon-appwkffr-pooler.c-7.us-east-1.aws.neon.tech` |
| `DIRECT_URL` | Unset in file → falls back to same pooler URL |
| Neon project | `plain-tree-50826299` |
| Neon endpoint | `ep-flat-moon-appwkffr` |
| Neon branch (SQL) | `null` |
| Postgres | `17.10` (Neon) |
| `NEON_BRANCH` env | unset |
| `VERCEL_ENV` in `.env.local` | `production` ⚠️ **misleading for local/lab** |
| Safety classification (without forcing lab env) | `unknown` (host has no lab/prod markers) |
| With prior lab practice `NEON_BRANCH=iam-lab` | classifies as **lab** |

### THIS IS NOT PRODUCTION — confirmation

| Check | Result |
|-------|--------|
| Intentionally targeted recovered production branch? | **No — not available** |
| Connected DB has production-scale business data? | **No** (21 MB, empty catalog) |
| Production modified? | **No** |
| Destructive commands run? | **No** (`migrate status` + read-only `SELECT` only) |

### Warnings

1. **`VERCEL_ENV=production` in `.env.local`** — can confuse safety classification if `APP_ENV`/`OTTO_ENV` are empty. Recommend unsetting or setting `OTTO_ENV=lab` / `NEON_BRANCH=iam-lab` for local work.  
2. **`DIRECT_URL` equals pooler URL** — Prisma recommends non-pooler for migrations; may cause migrate issues under load.  
3. **Prisma update notice** `5.22.0 → 7.x` — informational only; do not upgrade mid-rehearsal.  
4. **Dirty git tree** — production deploy should use a tagged, clean commit after hardening merges.  
5. **Neon branch name not queryable** — rely on console + env `NEON_BRANCH` for proof of target.

---

## 2. Production Snapshot (Connected Target)

**Scope clarification:** Snapshot is of the **currently connected** database (iam-lab-class). It is **not** a production recovery baseline.

**Artifact:** `docs/platform/identity/rehearsal-baseline-snapshot.json`  
**Fingerprint (SHA-256):** `dab1d08fa9332b1306f78f0c604a2772157c60173810318a02563230f56fe6b7`

### Structural inventory

| Metric | Value |
|--------|--------|
| Database size | 21 MB |
| Public tables | 194 |
| Indexes | 769 |
| Foreign keys | 186 |
| Views | 0 |
| Sequences | 95 |
| Extensions | `plpgsql` 1.0 |
| Schemas (non-system) | `public` only |
| `_prisma_migrations` | Exists, **25** applied |

### Business / platform row counts (highlight)

| Entity | Count | Notes |
|--------|------:|--------|
| users (legacy) | 1 | `nkosilekot@gmail.com` (admin) |
| tenants | 1 | |
| tenant_users | 0 | |
| organizations (legacy) | 0 | |
| artists | 0 | |
| releases | 0 | |
| tracks | 0 | |
| works | 0 | |
| contracts | 0 | |
| attachments | 0 | |
| api_keys | 0 | |
| audit_logs | 0 | |
| royalty_entitlements | 0 | |
| iam_identities | 1 | `admin@otto.com`, `legacyUserId=1` |
| iam_organizations | 1 | `OTTO Lab` / `otto-lab` |
| iam_organization_memberships | 1 | |
| iam_permissions | 43 | |
| iam_roles | 9 | |
| iam_role_permissions | 234 | |
| iam_sessions | 2 | |
| platform_events | 11 | |
| _prisma_migrations | 25 | |

### Non-zero tables only

IAM/lab artifacts dominate: permissions, role_permissions, security events, platform events, sessions, single user/identity/org. **No recoverable production catalog present.**

### SQL statements executed (Phase 2 — all read-only)

```sql
SELECT current_database(), current_user, version(),
  current_setting('neon.branch_name', true),
  current_setting('neon.endpoint_id', true),
  current_setting('neon.project_id', true);

SELECT extname, extversion FROM pg_extension;
SELECT schema_name FROM information_schema.schemata WHERE ...;
SELECT pg_size_pretty(pg_database_size(current_database())), pg_database_size(...)::text;
SELECT count(*) FROM pg_indexes WHERE schemaname='public';
SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' ...;
SELECT count(*) FROM information_schema.views / sequences ...;
SELECT tablename FROM pg_tables WHERE schemaname='public';
SELECT EXISTS (... '_prisma_migrations' ...);
SELECT migration_name, finished_at, rolled_back_at, left(checksum,16) FROM _prisma_migrations ...;
-- UNION ALL of count(*) per public table
SELECT id, email, status, "legacyUserId" FROM iam_identities LIMIT 20;
SELECT id, name, slug, status FROM iam_organizations LIMIT 20;
SELECT id, email, role, is_active, is_superuser FROM users ORDER BY id LIMIT 15;
```

---

## 3. Migration Analysis

### Disk inventory (`prisma/migrations`)

25 migrations (ordered):

1. `0001_initial`  
2. `20260611214305_add_plan_features`  
3. `20260612172322_add_api_keys`  
4. `20260612172526_add_api_keys_relation`  
5. `20260612173434_add_enterprise_features`  
6. `20260619000001_add_release_workspace_models`  
7. `20260717133500_add_attachment_model`  
8. `20260717140000_repair_workspace_tables`  
9. `20260717141000_repair_iam_tenant_tables`  
10. `20260728120000_add_platform_document_assets`  
11. `20260728140000_document_intelligence`  
12. `20260728150000_human_verification`  
13. `20260728160000_verified_contract_domain`  
14. `20260728170000_contract_relationships`  
15. `20260728180000_contract_lifecycle`  
16. `20260728190000_platform_events_notifications`  
17. `20260728200000_release_contract_read_model`  
18. `20260728210000_platform_projection_checkpoints`  
19. `20260728220000_rights_domain`  
20. `20260728230000_royalty_entitlements`  
21. `20260729010000_iam_identity_platform` ← IAM foundation  
22. `20260729120000_iam_a2_password_lifecycle`  
23. `20260729140000_iam_a3_session_management`  
24. `20260729150000_iam_a4_mfa_totp`  
25. `20260729160000_iam_a5_org_rbac`  

### Connected DB (`_prisma_migrations`)

| Check | Result |
|-------|--------|
| Table exists | Yes |
| Count | 25 |
| Order | Matches disk names (finished_at sequence 2026-07-29) |
| Rolled back | None |
| Pending vs disk | **None** — `prisma migrate status`: **Database schema is up to date!** |
| Unexpected migrations | None observed |
| Checksum full verify | Prefix only recorded; full checksum recompute not run |

### What would execute on this connected DB?

**Zero pending migrations.** `prisma migrate deploy` would be a no-op.

### What would execute on a *true* recovered production DB?

**Unknown until that branch is connected.** Expected scenarios:

| Scenario | Pending | Risk |
|----------|---------|------|
| Prod already has full chain through `iam_a5` | 0 | Bootstrap + legacy user migrate only |
| Prod stopped before platform domain (pre-20260728) | Many (docs/rights/events + IAM) | **High** — long migrate, need size-based timing |
| Prod stopped before IAM only (post-royalties) | 5 IAM migrations | **Moderate** — additive |
| Prod history diverged / checksum mismatch | Fail | **Critical** — stop and reconcile |

### Migration plan (template for recovered branch)

```
1. Confirm NEON_BRANCH / endpoint ≠ production primary
2. Snapshot baseline counts + fingerprint (this report's method)
3. SELECT * FROM _prisma_migrations ORDER BY finished_at
4. Diff names against prisma/migrations/
5. npx prisma migrate diff --from-url $DIRECT_URL --to-migrations prisma/migrations --script > /tmp/pending.sql
6. Human review of pending.sql
7. Only then: npx prisma migrate deploy
```

**Not executed against recovered production (unavailable).**

---

## 4. Risk Assessment

### Destructive pattern scan (all migration SQL on disk)

```
grep -RniE 'drop table|drop column|truncate|delete from|rename column' prisma/migrations
→ No matches
```

Only comment: IAM foundation says *“do not drop legacy tables.”*

### Per-area risk (IAM-relevant migrations)

| Migration | Affects | Risk | Rollback difficulty | Notes |
|-----------|---------|------|---------------------|--------|
| `iam_identity_platform` | New `iam_*` tables + FKs among themselves | **Safe–Moderate** | Hard (DDL reverse) | Additive; does not rewrite business tables |
| `iam_a2_password_lifecycle` | ALTER `iam_identities`, `iam_password_history` | **Safe** | Easy | IF NOT EXISTS style columns |
| `iam_a3_session_management` | New devices/audit; ALTER sessions | **Safe** | Medium | Additive |
| `iam_a4_mfa_totp` | MFA challenges; org mfaPolicy | **Safe** | Medium | Additive |
| `iam_a5_org_rbac` | Org owner/policies; membership flags; audit | **Safe** | Medium | Additive |
| Pre-IAM platform migrations (docs, rights, royalties, events) | New domains | **Moderate–High** on large prod | Hard | Depends on whether already applied on prod |
| `0001_initial` / repair migrations | Wide schema | **Critical** if re-applied | N/A | Must already be in history; never re-run |
| Bootstrap (data) | IAM seed only | **Safe** if idempotent | Easy | No business DELETE |
| `migrate-legacy-auth` | Creates identities; random passwords | **High** (ops) | Medium | Does not delete users; login behavior changes |

### Categorization summary

| Category | Items |
|----------|--------|
| **Safe** | Additive IAM DDL already reviewed; bootstrap idempotent path |
| **Moderate** | Large CREATE INDEX on big tables if pre-IAM migrations pending; pooler DIRECT_URL |
| **High Risk** | Legacy password cutover (users cannot login with old bcrypt until reset/migrate design) |
| **Critical** | Wrong database target; migration history divergence; running reset |

---

## 5. Dry Run Validation (Simulated)

### Expected on **connected lab DB** (not production rehearsal)

| Step | Expected |
|------|----------|
| `migrate deploy` | No SQL; already up to date |
| Locks | None material |
| Runtime | Seconds |
| Bootstrap | Idempotent exit or non-destructive re-seed |
| IAM changes | No new identities/orgs if admin email matches |
| Failure points | Env missing INITIAL_ADMIN_*; wrong password policy |

### Expected on **recovered production** (hypothetical — requires validation)

| Step | Expected |
|------|----------|
| Pending migrations | 0–N depending on prod history |
| SQL | From pending migration files only (CREATE/ALTER additive for IAM) |
| Locks | ACCESS EXCLUSIVE unlikely for pure CREATE TABLE; ALTER ADD COLUMN may lock table briefly |
| Runtime | IAM-only: minutes; full platform backlog: size-dependent (estimate after `pg_table_size`) |
| Bootstrap | Creates catalog + **one** admin if empty IAM; if prod has users, must not collide |
| Failure points | Checksum mismatch; missing extensions; connection via pooler mid-migrate; disk full; concurrent app writes |

### Failure points checklist

1. Wrong Neon branch  
2. `_prisma_migrations` checksum mismatch  
3. Partial migrate crash mid-file  
4. Bootstrap without `INITIAL_ADMIN_*`  
5. Bootstrap creating second org when tenants already map differently  
6. Legacy migrate randomizing all passwords without communication plan  
7. App deploy before migrate complete  
8. Missing `IAM_ENCRYPTION_KEY` in production app env  

**Dry-run `migrate diff` against recovered production: not run (no target).**

---

## 6. Bootstrap Analysis (`npm run bootstrap:iam`)

### Against an **existing production-like** database

| Concern | Behavior |
|---------|----------|
| Existing permissions | Upsert by `key` — no duplicates |
| Existing roles | Upsert by `(organizationId, key)`; `createMany` skipDuplicates for role_permissions |
| Existing IAM org | Reuses first / owned org; does not create second if any exists |
| Existing admin email | Does not recreate; does not reset password unless `--reset-admin-password` + destructive allow |
| Memberships | Upserts owner membership for admin identity |
| Demo data | **None** |
| Legacy `users` table | **Untouched** |
| Contracts/artists/etc. | **Untouched** |

### Write operations (complete list)

1. `iam_permissions` upsert (catalog)  
2. Optionally `iam_identities` insert/update (admin only)  
3. Optionally `iam_password_credentials` / `iam_credentials`  
4. Optionally `iam_organizations` insert (only if zero orgs)  
5. `iam_roles` upsert + `iam_role_permissions` createMany  
6. `iam_organization_memberships` create/update for admin→owner  

### Conflicts

| Conflict | Handling |
|----------|----------|
| Email already IAM | Use existing identity |
| Org exists | Reuse; attach owner if missing |
| Partial bootstrap | Completes missing steps |
| Fully initialized | Exit 0 (unless `--force`) |
| Production classification | Blocked without `--allow-production` |

### Lab observation (prior hardening)

Idempotent bootstrap confirmed on this DB: 1 identity, 1 org, 1 membership after `--force`.

### Gap for production rehearsal

Bootstrap alone **does not** migrate all legacy users. It creates **one** break-glass admin. Full user population requires **`migrate-legacy-auth`** (separate, high-impact).

---

## 7. Authentication Migration Analysis

### How legacy users become IAM users

**Script:** `scripts/migrate-legacy-auth.ts` → `lib/platform/identity/services/legacy-migration.ts`  
**Report-only:** `scripts/migrate-legacy-auth-report.ts` (without `--migrate`)

| Step | Detail |
|------|--------|
| Source | `users` (Prisma `User`) |
| Identity | Create `iam_identities` with `legacyUserId`, email, displayName |
| Credential | Argon2id password; **default = random unusable** unless `--password=` per user |
| Email match | If IAM email exists, link `legacyUserId` only |
| Already linked | No-op return |
| Org mapping | From `tenant_users` → `iam_organizations.legacyTenantId` |
| Role mapping | Default tenant → `org_admin`; else `member` (not full Super Admin matrix) |
| Session migration | **None** — sessions not ported; users re-login |
| Password migration | **Bcrypt not auto-verified on login** in current path; random password forces reset flow |
| Bcrypt helper | `verifyLegacyBcrypt` exists but is **not** wired into authentication login path in this analysis |

### Critical production implication

After `migrateAllLegacyUsers()` without plain passwords:

- Users **cannot** log in with historical passwords.  
- Must use **forgot-password** or admin-set passwords.  
- Communication plan is **mandatory** before production cutover.

### On connected lab DB

| Metric | Value |
|--------|------:|
| Legacy users | 1 (`nkosilekot@gmail.com`) |
| IAM identities | 1 (`admin@otto.com`, linked `legacyUserId=1`) |
| Email mismatch | Legacy email ≠ IAM email — lab artifact |

**Migrate scripts were not executed in this assignment** (analysis only).

---

## 8. Business Data Validation

### Do IAM migrations alter business data?

| Domain | Altered by IAM DDL? | Altered by bootstrap? | Altered by legacy-auth migrate? |
|--------|---------------------|------------------------|----------------------------------|
| Contracts | No | No | No |
| Documents / attachments | No | No | No |
| Releases / tracks / works / artists | No | No | No |
| Royalties / rights | No | No | No |
| Audit logs | No | No | No |
| API keys | No | No | No |
| Legacy users row content | No | No | No (read + link only) |
| Relationships / FKs among business tables | No | No | No |

IAM migrations are **parallel additive** schema. Comment in foundation migration explicitly forbids dropping legacy auth tables.

### Caveats

1. Pre-IAM platform migrations (if still pending on real prod) create **new** domain tables — should not rewrite existing contract rows, but must be reviewed per pending SQL.  
2. Application code cutover to IAM-only login **changes access path**, not row content.  
3. Empty lab DB cannot prove “no data loss” under production volume.

---

## 9. Deployment Sequence (Exact Production Sequence)

### Preconditions

- [ ] Recovered Neon branch created from production (PITR / branch)  
- [ ] Branch name recorded (`prod-rehearsal-YYYYMMDD`)  
- [ ] Connection strings in isolated env file (never prod primary)  
- [ ] `NEON_BRANCH`, `OTTO_ENV=rehearsal` set  
- [ ] Clean git tag for deploy artifact  
- [ ] Change window + rollback owner named  

### Sequence

| # | Step | Owner | Est. duration | Downtime | Approval |
|---|------|-------|---------------|----------|----------|
| 0 | Freeze writes on prod if cutover (rehearsal: N/A) | Ops | — | — | Lead |
| 1 | Verify target ≠ production endpoint | Ops | 5 min | No | Lead |
| 2 | Baseline snapshot (counts + fingerprint) | Ops | 10–30 min | No | — |
| 3 | Backup / note Neon PITR restore point | Ops | 5 min | No | — |
| 4 | `npx prisma migrate status` + review pending | Ops | 10 min | No | Eng |
| 5 | Optional: `migrate diff` script review | Eng | 30–60 min | No | Eng |
| 6 | **Checkpoint A** — approve migrate | Lead | — | — | Lead |
| 7 | `npx prisma migrate deploy` via `DIRECT_URL` non-pooler | Ops | 1–30+ min | Prefer maintenance | Lead |
| 8 | Re-count migrations; schema smoke | Ops | 10 min | No | — |
| 9 | **Checkpoint B** — approve bootstrap | Lead | — | — | Lead |
| 10 | `INITIAL_ADMIN_*` + `npm run bootstrap:iam` | Ops | 1–5 min | No | — |
| 11 | `npm run bootstrap:iam` second run (idempotency) | Ops | 1 min | No | — |
| 12 | **Checkpoint C** — approve user migrate (if required) | Lead | — | — | Lead+Sec |
| 13 | `migrate-legacy-auth-report` (no write) | Eng | 5 min | No | — |
| 14 | `migrate-legacy-auth` (controlled) | Eng | size-dependent | No* | Lead |
| 15 | Deploy app build pointing at rehearsal | Ops | 10 min | No | — |
| 16 | Auth smoke (admin + sample users) | QA | 30 min | No | — |
| 17 | Business module smoke | QA | 1–2 h | No | — |
| 18 | Monitoring watch | Ops | 1 h | No | — |
| 19 | Sign-off or rollback | Lead | — | — | Lead |

\*User migrate does not require DB downtime but **invalidates old passwords** if randomized.

### Operator responsibilities

- **Ops:** target verification, backups, migrate deploy, env secrets  
- **Eng:** pending SQL review, bootstrap config, legacy migrate  
- **QA:** smoke matrix  
- **Lead:** go/no-go each checkpoint  

---

## 10. Rollback Strategy

| Failure mode | Action |
|--------------|--------|
| Migrate fails mid-way | Stop app traffic; do **not** continue; restore Neon branch from pre-migrate PITR / re-branch from production snapshot |
| Bootstrap wrong admin | Non-destructive fix: correct env + re-run; or disable identity; do not wipe DB |
| Auth failure after cutover | Roll app to previous release; leave schema if additive OK; or restore branch |
| Permission / RBAC failure | Re-run `seedOrgSystemRoles`; fix memberships; do not reset DB |
| Partial deploy (app new, DB old) | Roll app back |
| Partial deploy (DB new, app old) | Usually OK if app ignores new tables; verify |
| Full disaster | Neon PITR to timestamp before migrate; redeploy previous app |
| After legacy password migrate | Communicate reset; or restore branch if rehearsal only |

### Validation after rollback

1. `_prisma_migrations` matches pre-change list  
2. Business row counts == baseline fingerprint  
3. Login with pre-cutover method works  
4. No residual dual-write corruption  

### Rehearsal-specific

On a **branch**, rollback = **delete branch / restore to parent** — never touch production primary.

---

## 11. Monitoring Plan

| Signal | Where | Threshold / action |
|--------|-------|---------------------|
| Application errors | App logs / Vercel | Spike → investigate |
| Prisma errors | App logs | P20xx → stop traffic if migrate-related |
| Auth failures | `iam_login_attempts`, `iam_security_events`, logs | > baseline ×3 sustained |
| IAM events | `platform_events` / security events | Schema validation errors = 0 |
| Session creation | `iam_sessions` rate | Collapse → auth outage |
| DB locks | `pg_locks` / Neon metrics | Long ACCESS EXCLUSIVE |
| Slow queries | Neon insights | p95 > SLO |
| Platform event publish failures | Logger `platform.events` | Any sustained |
| CPU / connections | Neon dashboard | Saturation |

**Alert thresholds (initial proposal):**

- Auth failure rate > 20% of attempts over 5 minutes  
- 5xx rate > 1%  
- Migration job non-zero exit  
- Zero successful logins in 10 minutes post-cutover  

---

## 12. Production Readiness Answers

| Question | Answer | Class |
|----------|--------|-------|
| Is the recovered database ready? | **No recovered DB available** | **Requires validation** |
| Is the migration safe? | Additive IAM DDL **looks** safe; full pending set unknown | **Assumed** for IAM-only; **Requires validation** on real pending set |
| Is bootstrap safe? | Yes for empty/partial IAM; idempotent | **Verified** (lab) |
| Is authentication safe? | Lab yes; prod depends on legacy migrate plan | **Requires validation** |
| Is rollback sufficient? | Neon branch/PITR strategy yes **if** rehearsal branch exists | **Assumed** |
| Is monitoring sufficient? | Plan exists; not instrumented as alerts yet | **Needs improvement** |
| Remaining blockers? | **Yes — see below** | |

### Verified

- Connected target is **not** production primary with live business data  
- Lab has full 25 migrations applied  
- No DROP/TRUNCATE in migration SQL  
- Bootstrap idempotency (prior hardening)  
- IAM event validation fix present in working tree  
- Safety guards exist in bootstrap  

### Assumed

- Real production migration history is a clean prefix of repo migrations  
- Neon PITR available for production project  
- Operators will use non-pooler `DIRECT_URL` for migrate  

### Requires validation

- Actual recovered production baseline  
- Pending migration set + runtime on prod data size  
- Legacy user volume + password communication  
- End-to-end smoke on non-empty catalog  
- Clean release commit (dirty tree today)  

### Blockers for production deployment

1. **No completed rehearsal on recovered production data**  
2. **Legacy password cutover strategy not approved**  
3. **Working tree not frozen/tagged**  
4. **Production env secrets / NEON target proof not demonstrated here**  

---

## 13. Rehearsal Execution Results

### Decision

**STOPPED before any write sequence intended as production rehearsal.**

### Why

1. Mission requires recovered **production** data.  
2. Connected database is empty lab (fingerprint above).  
3. Continuing would create a **false positive** “green” rehearsal.  

### What was executed (allowed)

| Command / SQL | Purpose | Writes? |
|---------------|---------|---------|
| `git` / `node` / `prisma -v` | Env verify | No |
| Neon metadata `SELECT` | Target identity | No |
| Full table counts `SELECT` | Baseline | No |
| `npx prisma migrate status` | Pending plan | No |
| Grep migration SQL | Risk | No |

### What was **not** executed

- `prisma migrate deploy` (as rehearsal — would be no-op on lab anyway)  
- `bootstrap:iam` as production rehearsal  
- `migrate-legacy-auth`  
- App start smoke as production rehearsal  
- Any production connection  

### If analysis had concluded “safe to execute on recovered branch”

Would have required:

1. Operator-supplied recovered branch URL  
2. Second confirmation `endpoint ≠ production primary`  
3. Fresh PITR note  
4. Then steps 7–17 of §9  

---

## Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Proceeding without recovered-data rehearsal | Critical | High if rushed | Hard gate: no prod until §13 green |
| Password reset storm | High | High if bulk migrate | Staged migrate + comms |
| Migration history drift | Critical | Medium | Checksum audit first |
| Wrong DB target | Critical | Low with guards | Dual human confirmation |
| Pooler for migrate | Medium | Medium | Non-pooler DIRECT_URL |
| Dirty git deploy | Medium | High now | Tag clean release |
| Misleading VERCEL_ENV=production locally | Medium | Observed | Fix env files |

---

## Recommendations

1. **Create Neon branch** `prod-rehearsal-YYYYMMDD` from production; store credentials in a **separate** env file (not production).  
2. Re-run this report’s Phase 1–2 against that branch; attach new fingerprint.  
3. Run `migrate status` + `migrate diff`; review pending SQL line-by-line.  
4. Execute Phase 13 only after dual approval.  
5. Decide password strategy:  
   - **A)** Forced reset all (simplest, highest support load)  
   - **B)** Wire first-login bcrypt→Argon2 rehash (engineering work before prod)  
6. Freeze release: commit IAM hardening, tag `iam-prod-rehearsal-1`.  
7. Set `NEON_BRANCH` / `OTTO_ENV` on every environment.  
8. Do **not** treat iam-lab success as production readiness alone.

---

## Remaining Technical Debt

1. Neon branch name not available via SQL settings  
2. Legacy bcrypt silent upgrade path not production-wired  
3. Role mapping from legacy `role` string → IAM permission sets is coarse (`org_admin`/`member`)  
4. CI still not rehearsing migrate against ephemeral DB  
5. No automated post-migrate row-count assertion harness  
6. Prisma 5.x → 7.x upgrade backlog  
7. Dual legacy + IAM identity model until full cutover  

---

## Final Conclusion

# NOT READY FOR PRODUCTION

| Attribute | Value |
|-----------|--------|
| **Confidence** | **High** |
| **Evidence** | No recovered production branch; no non-empty data integrity rehearsal; legacy password cutover unresolved; dirty tree; Phase 13 stopped by design |
| **Assumptions still open** | Production migration history cleanliness; runtime of pending migrations on full data; org/tenant mapping completeness; password UX acceptance |

### Path to “READY FOR CONTROLLED PRODUCTION DEPLOYMENT”

1. Recovered production branch exists and is proven ≠ primary.  
2. Baseline fingerprint on real data.  
3. Pending migrations reviewed and applied successfully on branch.  
4. Bootstrap + idempotency proven.  
5. Legacy auth migrate plan approved and smoke-tested.  
6. Business modules smoke pass on real data.  
7. Rollback drill completed once.  
8. Clean tagged release + monitoring alerts live.  

Until then, remain at **NOT READY FOR PRODUCTION** despite strong **iam-lab engineering validation**.

---

## Appendix A — Command chronology

| Time (UTC) | Command | Result |
|------------|---------|--------|
| 13:59:32 | git/node/prisma version | OK; branch main @ b780d34 |
| 14:00 | Env/host inspection + Neon metadata | endpoint ep-flat-moon-appwkffr; branch null |
| 14:00–14:03 | Read-only baseline counts | 194 tables; 21 MB; empty business data; fingerprint dab1d08f… |
| 14:04:00 | `npx prisma migrate status` | 25 migrations; up to date |
| — | Phase 13 writes | **Not run** |

## Appendix B — Related documents

- `docs/platform/identity/production-readiness.md`  
- `docs/platform/identity/bootstrap.md`  
- `docs/platform/identity/deployment-workflow.md`  
- `docs/platform/identity/cicd-workflow.md`  
- `docs/platform/identity/rca-organization-create-hang.md`  
- `docs/platform/identity/event-validation-report.md`  
- `docs/platform/identity/rehearsal-baseline-snapshot.json`  
