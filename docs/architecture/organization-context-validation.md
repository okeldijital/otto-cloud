# Organization Context — Validation Report

**Date:** 2026-07-20  
**Environment:** Neon PostgreSQL (development `DATABASE_URL`)  
**Resolver:** `lib/auth/organization-context.ts`

---

## Automated tests

```bash
npm run test:org-context
```

| Suite | Result |
|-------|--------|
| migration-compat unit checks | **7/7 passed** |
| unauthenticated → 401 | **passed** |
| unassigned user → 403 NO_ORGANIZATION | **passed** |
| admin@otto.com resolves legacy catalog + artists/releases > 0 | **passed** |
| multi-org user (orga_admin) sees catalog | **passed** |
| validateMembership superuser bypass | **passed** |

**Total: 12 passed, 0 failed**

---

## Catalog counts under resolved context

Session simulated for `admin@otto.com` → `getOrganizationContext()`:

| Field | Value |
|-------|--------|
| `organizationId` | Legacy catalog scope (`LEGACY_CATALOG_SCOPE_ID` / import UUID) |
| `dataScopeSource` | `legacy-compat` or `superadmin` |

| Entity | Count visible via context filter |
|--------|----------------------------------|
| Artists (`organization_id` + not deleted) | **139** |
| Releases (`organization_id` + not deleted) | **99** |
| Works (`organization_id` + not deleted) | **25** |
| Tracks | **389** (global entity — no org column) |
| Labels | **14** (global) |
| Publishers | **13** (global) |
| Contracts (`legacyIntOrgId`) | **15** |

These match the previously empty UI lists once JWT claims resolve to the same scope (re-login after deploy).

---

## Isolation checks

| Scenario | Expected | Status |
|----------|----------|--------|
| User with unassigned org (post-register) | 403, no catalog | Covered by test |
| Wrong tenant membership | validateMembership false (non-superuser) | Covered |
| Superadmin | may access legacy catalog | Covered |
| New org create | catalog scope = new tenant id (empty catalog) | Code path in POST /organizations |
| Invite accept | membership + both claim fields | Code path in invitations/accept |

---

## Manual UI checklist (post-deploy)

1. **Re-login** as `admin@otto.com` (refreshes JWT claims).
2. Open Dashboard — no 500 from org-scoped widgets.
3. Catalog → Artists — expect ~139 rows.
4. Catalog → Releases — expect ~99 rows.
5. Catalog → Tracks — expect ~389 rows.
6. Catalog → Works — org-scoped rows.
7. Contracts / Individuals — int-scoped via compat.
8. If multi-org user available: switch org → call `session.update` with returned claims → lists change / empty for greenfield org.

Screenshots: capture after re-login in your environment; automated count proof is above.

---

## Known residual risks

1. **Stale JWT** if user does not re-login after deploy and never calls `session.update`.
2. **No UI wire-up yet** for `session.update` after org switch (API ready).
3. **Tracks/labels/publishers** still global — isolation incomplete until schema PR.
