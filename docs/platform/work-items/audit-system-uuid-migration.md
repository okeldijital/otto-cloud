# Platform Task: Audit System UUID Migration

| Field | Value |
|-------|--------|
| **Title** | Audit System UUID Migration |
| **Status** | Scheduled |
| **Priority** | High |
| **Owner** | Platform |
| **Target** | Before Production |
| **Blocks Milestone 2?** | No |
| **Scope** | Platform infrastructure — **not** Contract Center |

---

## Problem

Contract Center and the broader multi-tenant model identify organizations with **UUID** strings (`OrganizationContext.organizationId`).

The platform audit path still assumes **integer** organization identifiers:

| Location | Behavior |
|----------|----------|
| `prisma.audit_logs.organization_id` | `Int?` |
| `lib/audit.ts` → `recordAudit` | `parseInt(entry.organization_id) \|\| null` |
| `lib/audit.ts` → `getAuditLogs` | `parseInt(params.organization_id)` for filters |

When callers pass a real UUID org id, `parseInt` yields `NaN` → stored as `null` (or an incorrect integer). Audit rows can be **missing org scope**, **mis-attributed**, or **unfilterable** by organization.

This is an architectural inconsistency between:

- **UUID-based product modules** (Contract Center direction, catalog, most UUID-scoped tables)
- **Integer-scoped audit infrastructure** (desktop-era `audit_logs`)

Continuing with the mismatch risks incomplete or incorrect audit records in production.

---

## Decision

| Rule | Detail |
|------|--------|
| Do **not** block Milestone 2 (Document Repository) | Document management can proceed |
| Create this platform work item **immediately** | Tracked here; owner = Platform |
| Do **not** solve inside the Contract module | No Contract Center-only audit fork; fix the shared `lib/audit.ts` + schema once |
| Ship fix **before production** | Hard gate for multi-tenant audit correctness |

---

## Current state (evidence)

```25:25:lib/audit.ts
        organization_id: entry.organization_id ? parseInt(entry.organization_id) || null : null,
```

```557:559:prisma/schema.prisma
  entity_uuid     Int?
  organization_id Int?
  tenant_id String? @db.Uuid
```

Related debt is already noted under INT-scoped tables in
[`docs/architecture/organization-context-technical-debt.md`](../../architecture/organization-context-technical-debt.md)
and ADR-001 integer-column compatibility (`legacyIntOrgId`).

---

## Target state

1. `audit_logs.organization_id` is a **UUID** (string), aligned with `OrganizationContext.organizationId`.
2. `recordAudit` / `getAuditLogs` accept and store UUID org ids with **no** `parseInt` coercion.
3. Existing rows are **backfilled** or dual-written during transition so historical audits remain queryable.
4. Contract Center (and every other module) continues to call the **same** platform audit API.

Optional follow-ups (same owner, may ship with this or immediately after):

- Align `entity_uuid` type if still mis-modeled as `Int`
- Prefer UUID entity ids for Contract Center entities once those tables migrate (see [legacy-contract-migration.md](../legacy-contract-migration.md))

---

## Implementation outline (platform)

1. **Schema** — Add UUID org column (or migrate `organization_id` Int → Uuid); keep temporary compat column if required.
2. **Write path** — Stop `parseInt`; write `context.organizationId` (UUID).
3. **Read path** — Filter by UUID; dual-read during backfill if needed.
4. **Backfill** — Map historical int org ids via existing `legacyIntOrgId` / org mapping tables.
5. **Call-site audit** — Grep for `recordAudit` / raw `audit_logs.create`; ensure UUID is passed.
6. **Validation** — Multi-org isolation tests: create action in org A, assert org B cannot list it; assert UUID stored literally.
7. **Cleanup** — Drop int column / parseInt; update technical debt checklist.

---

## Exit criteria

- [ ] No `parseInt` on organization id in `lib/audit.ts`
- [ ] Prisma `audit_logs.organization_id` is UUID (or dual-column removed after cutover)
- [ ] New audit rows always store the active Organization UUID
- [ ] Historical rows queryable by org after backfill
- [ ] Multi-org isolation proof in CI or headless evidence pack
- [ ] Technical debt row updated / closed

---

## Non-goals

- Reworking Contract Center document storage or PDF viewing (Milestone 2)
- Migrating legacy `contracts` INT schema (see [legacy-contract-migration.md](../legacy-contract-migration.md))
- AI OCR / extraction (Milestone 3)

---

## References

- `lib/audit.ts`
- `prisma/schema.prisma` → `audit_logs`
- [ADR-001](../../architecture/decisions/ADR-001-isolation-boundary.md)
- [multi-tenant-model.md](../../architecture/multi-tenant-model.md)
- [organization-context-technical-debt.md](../../architecture/organization-context-technical-debt.md)
)
