# Root Cause Analysis — `organizationService.createOrganization()` hang

## Symptom

During iam-lab initialization, `organizationService.createOrganization()` appeared to
hang indefinitely (or for many minutes) with no error returned.

## Call sequence

```
OrganizationService.createOrganization
  ├─ organizationRepository.findBySlug
  ├─ organizationRepository.create          # single INSERT — fast
  ├─ seedOrgSystemRoles(org.id)             # ← bottleneck
  │    ├─ seedIamPermissions()
  │    │    └─ for each permission: await upsert   # ~43 sequential RTs
  │    └─ for each system role (9):
  │         ├─ await role upsert
  │         └─ for each role permission:
  │              await rolePermission upsert         # up to ~40 each
  ├─ membershipService.createMembership
  │    ├─ policy / role lookups
  │    ├─ membership upsert
  │    ├─ emitIdentityEvent(MembershipCreated)      # bus publish
  │    └─ emitIdentityEvent(RoleAssigned)
  └─ emitIdentityEvent(OrganizationCreated)
```

Total remote round-trips before fix: **~200–400 sequential** Prisma awaits
against Neon (often via **pooler** endpoint).

## Root cause

**Not** an async deadlock, event-bus circular wait, or open transaction hold.

**Primary cause:** `seedOrgSystemRoles` performed fully sequential per-row
`upsert` calls for every permission and every role-permission link. Over a
remote Neon connection (high RTT, cold starts, pooler), this took minutes and
looked like a hang during lab init.

**Contributing factors:**

| Factor | Impact |
|--------|--------|
| Neon pooler + high RTT | Each await ~20–100ms+ |
| No progress logging | Operators could not see work in progress |
| First-time publish bootstrap | Minor cost on first identity event (subscriber registration) — not the hang |
| No timeout | Client waited until all sequential work finished |

**Ruled out:**

- Event bus deadlock (publish uses `publishSafe`, non-blocking; subscribers for
  identity events do not re-enter org create)
- Transaction boundary deadlock (no interactive transaction wrapping create)
- Missing retry/timeout on Prisma (queries completed, just slowly)

## Fix

1. **Batch permission seeding** — chunked `Promise.all` upserts
2. **Batch role-permissions** — single `createMany({ skipDuplicates: true })`
   per role instead of N sequential upserts
3. **Bootstrap path** creates org + roles without relying on the slow path for
   first-time lab init; production `createOrganization` uses the same optimized seed

Files:

- `lib/platform/identity/services/permission-seed.ts`
- `lib/platform/identity/organizations/OrganizationService.ts` (comment / path)

## Regression prevention

| Control | How |
|---------|-----|
| Bootstrap timing logs | `bootstrap-iam` prints ms for seed steps |
| Idempotent re-seed | `createMany` + `skipDuplicates` + upserts |
| Unit coverage | Existing RBAC catalog tests; seed remains pure data |
| Avoid sequential N+1 | Code review: no new per-permission await loops |
| Prefer bootstrap script for deploy | Documented deployment flow |

## Verification

After fix, on iam-lab (or equivalent):

```bash
# Seed roles for a test org should complete in seconds, not minutes
npx tsx -e "
  // timed seedOrgSystemRoles against existing org
"
npm run bootstrap:iam   # steps 1 and 4 should log < few seconds each
```

Expected: organization create + role seed **&lt; 10s** on warm Neon; cold start
may be slightly higher but must complete.
