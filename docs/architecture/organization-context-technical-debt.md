# Organization Context — Remaining Technical Debt

**Date:** 2026-07-20  
**Related:** ADR-001, multi-tenant-model.md §4.3 / §6

---

## Intentionally deferred

| Item | Why deferred | Removal / follow-up |
|------|--------------|---------------------|
| **Tracks lack `organization_id`** | Schema change + backfill; out of scope for resolver milestone | Add UUID column, backfill from release/work, filter in API |
| **Labels / publishers / PROs lack org column** | Same | Schema + backfill |
| **INT-scoped tables** (contracts, individuals, some AI) | Large migration; compat maps via `legacyIntOrgId` | Migrate columns to UUID org id |
| **`users.organization_id` NOT NULL** | Requires Prisma migration; unassigned sentinel used instead | Make nullable; drop unassigned UUID |
| **Legacy catalog UUID** | Imported data still keyed to import scope | Re-key rows to real `tenants.id`; delete `migration-compat` mapping |
| **Dual JWT claims** (`tenant_id` + `organization_id`) | Transition; same active org | Collapse to one claim after re-key |
| **Deprecated `getOrgIds` / `getOrgFromSession`** | Call-site safety during roll-out | Delete when no imports remain |
| **`lib/storage/legacy.ts` default org** | Uses compat getter | Require explicit org id from callers |
| **UI `session.update` after org switch** | API returns claims; no switcher UI found | Wire settings org switcher to NextAuth `update()` |
| **Registration UX wizard** | API returns `requiresOrganization` | Frontend onboarding: invite vs create org |
| **RBAC still partially role-string based** | Pre-existing | Expand permission matrix per org membership role_id |
| **API key auth path** | Uses key.organization_id directly (v1) | Document as machine principal with fixed org; optional context adapter |
| **N+1 release list enrichment** | Performance, not tenancy | Batch contract/track lookups |
| **Hardcoded default in Prisma schema** `@default(...0001)` | DB-level; migration framework unchanged | Alter defaults after re-key |
| **Full audit of 540 lines** | Generated inventory; some DEFER rows need human review | Continuous cleanup PRs |

---

## Compatibility layer removal checklist

When ready to delete `lib/auth/migration-compat.ts` builtins:

- [ ] All catalog UUID rows use real `tenants.id`
- [ ] All users have membership rows
- [ ] No production dependency on `LEGACY_CATALOG_SCOPE_ID`
- [ ] Validation report re-run with multi-org isolation proofs
- [ ] ADR-001 amended: “compat layer removed”

---

## Non-goals (explicit)

- Changing the migrate-data framework
- Removing organization filters from catalog
- Introducing a second context system
- Auto-creating organizations on registration
