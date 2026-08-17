# R4–R7 — Single-Failure Remediation Report: `ai/contracts` Parse Error

**Mode:** Local working-tree inspect. No source edit was possible without inventing a change. No commit, push, deploy, Neon, IAM, or dependency change.

**Date:** 2026-08-17

**Verdict:** `BLOCKED — NEW FAILURE`

The block is **not** production remaining on `911c483`. That was ignored as a reason to stop.

The block is: the exact malformed `Promise.all(...)` closure (`});` that should be `}));`) is **genuinely absent** from the current local R4–R7 working tree. This gate is not authorized to invent a different edit.

---

## Failure (isolated Vercel preview)

| Item | Value |
|------|-------|
| Deployment | `dpl_D7VsJYQ7t9Rcja72YUDqBM7P7K2c` |
| Branch (that deploy) | `security/r4-r7-residual-boundary-remediation` |
| Commit (that deploy) | `07dbd28` |
| File | `app/api/ai/contracts/route.ts` |
| Line (on that SHA) | `29` |
| Error | `Expected ',', got ';'` |
| Root cause (on that SHA) | malformed `Promise.all(...)` closure: `});` instead of `}));` |

That Vercel SHA compiled a one-line `Promise.all((...).map(async (...) => { ... });` that is missing the `)` that closes `Promise.all(`.

This gate did **not** treat the remote branch as a reason that a local fix cannot be made. It inspected the **current dirty local file** as required.

---

## Step 1 — Local working-tree inspection

| Item | Value |
|------|-------|
| Branch | `main` |
| HEAD | `911c483` |
| Evaluated tree | dirty local R4–R7 working tree (authorized) |
| File | `app/api/ai/contracts/route.ts` (already modified vs HEAD) |

`git status --short` still shows the pre-existing R4–R7 implementation and lockfile reconciliation. Those were left in place.

### What line 29 is locally

```ts
return NextResponse.json(run);
```

That is the GET `extract` success return. It is not a `Promise.all` close.

### What the local `Promise.all` actually is

Lines 88–106:

```ts
const created = await Promise.all(
  (links || []).map(async (link: any) => {
    const entityId = await requireEntityReferenceInOrg(
      link.entity_type,
      link.entity_id,
      ctx
    );
    return prisma.ai_contract_resolution_links.create({
      data: { ... },
    });
  })
);
```

Parse of that expression:

| Token | Role |
|-------|------|
| `Promise.all(` | open |
| `.map(async (link) => {` | open callback |
| `.create({` | open create-arg |
| `});` (line 104) | close **create**, not Promise.all |
| `})` (line 105) | close **map callback** |
| `);` (line 106) | close **Promise.all** |

That is already the valid form. There is no `});` that is incorrectly closing `Promise.all(...)`.

The `git diff` vs HEAD for this file is the existing R5 authorization work (imports, `requireActorUserId`, `requirePositiveIntId`, `requireEntityReferenceInOrg`, fail-closed catch). That pre-existing implementation already converted the HEAD `.map((link) => create(...))` into an async map whose `Promise.all(` is closed with `);`.

---

## Correction

**Not applied.**

The authorized change is only:

```text
});   →   }));
```

where that `});` incorrectly closes `Promise.all(...)`.

No such token exists in the local file. Candidate misapplications that were **not** made:

- Line 29 `return NextResponse.json(run);` — not a Promise.all close.
- Line 104 `});` — closes `prisma.ai_contract_resolution_links.create({...})`. Changing it to `}));` would be a new syntax error.
- Lines 105–106 `})` + `);` — already the correct split close of map + Promise.all.

Applying the known delimiter change here would be a speculative rewrite of already-valid syntax.

---

## Validation

Not run after a correction, because no correction was made.

Prior lockfile-gate results on this same local working tree (recorded earlier; not re-claimed as this gate’s work):

| Gate | Prior recorded result |
|------|------------------------|
| `npm ci` | PASS (previous lockfile gate) |
| TypeScript | PASS (previous lockfile gate) |
| lint | PASS (previous lockfile gate) |
| build | PASS (previous lockfile gate) |
| A.8 / A.9 / R1–R3 / R4–R7 / identity | PASS (previous lockfile gate) |
| `git diff --check` | PASS (previous lockfile gate) |

This gate did not re-run those commands after a no-op.

| Gate this run | Result |
|---------------|--------|
| `npx tsc --noEmit` | **NOT RUN** |
| `npm run lint` | **NOT RUN** |
| `npm run build` | **NOT RUN** |
| security suites | **NOT RUN** |
| `git diff --check` | **NOT RUN** |

---

## Scope

This gate introduced **no parser correction** and **no other source change**.

Unchanged by this gate:

- `app/api/ai/contracts/route.ts`
- `package.json`
- `package-lock.json` (pre-existing lockfile reconciliation remains)
- Prisma schema / migrations
- `.env*`
- `.local/**`
- generated artifacts
- A.8 / A.9 / R1–R3 source

The report file is the only file written.

---

## External systems

| Action | Occurred? |
|--------|-----------|
| Commit | **No** |
| Amend | **No** |
| Push | **No** |
| Vercel deployment | **No** |
| Neon writes | **No** |
| Migrations | **No** |
| IAM writes | **No** |
| Production data changes | **No** |

Production remaining on `911c483` / `dpl_7S9D1mDUx6gKyDawtGMFZtvmZKa4` is expected and was not used as a stop reason.

This report does **not** claim `dpl_D7VsJYQ7t9Rcja72YUDqBM7P7K2c` is fixed. That deployment compiled `07dbd28`, whose `ai/contracts` source is not what is in the local dirty tree.

---

## Final verdict

**`BLOCKED — NEW FAILURE`**

Condition: the exact malformed `Promise.all` closure is absent from the authorized local R4–R7 working tree, so the one-line `});` → `}));` fix cannot be applied here.

The Vercel preview failure remains a property of commit `07dbd28`, not of the current local `app/api/ai/contracts/route.ts`.

Stopped. Awaiting the next explicit authorization if the intended next step is to operate on `07dbd28` itself, or to otherwise reconcile that SHA with this local tree.
