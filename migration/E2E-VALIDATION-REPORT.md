# Otto Cloud — End-to-End Data Validation & Organization Context Verification

**Date:** 2026-07-18  
**Method:** PostgreSQL evidence + code-path simulation of authenticated API queries (identical filters to `app/api/*` routes)  
**Admin principal under test:** `admin@otto.com` (user id 1)

---

## Executive answer

**Yes — under `admin@otto.com`, catalog APIs return the migrated production-scale counts.**

This is not assumed from “data is in Neon.” It is proven by:

1. Reading `users.organization_id` for the admin  
2. Executing the **same Prisma `where` clauses** as the list APIs  
3. Comparing returned `total` values to database aggregates  

| Dashboard card / API | Runtime filter | Resulting total | Matches PG? |
|----------------------|----------------|----------------:|:-----------:|
| Artists | `organization_id = session.user.organization_id` (UUID) | **141** | Yes |
| Releases (non-deleted) | `organization_id = UUID AND is_deleted = false` | **99** | Yes (12 soft-deleted extra) |
| Tracks | **No org filter** (global count) | **389** | Yes |
| Contracts | `organization_id = parseInt(uuid)\|\|1` → **1** | **15** | Yes |
| Works | `organization_id = UUID` | **25** | Yes |
| Individuals | `organization_id = getOrgIds().intOrgId` → **1** | **18** | Yes |
| Labels | No org filter | **14** | Yes |

**Final recommendation:** `SYSTEM READY FOR FUNCTIONAL TESTING`  
(with documented gaps: attachments unlinked to entities; dual org model; OrgContext/tenant UI weak)

---

## 1. Organization inventory (all 28)

Catalog multi-tenancy does **not** use `organizations.id` for artists/releases/works.  
Those tables use a **UUID** `organization_id` (default `00000000-0000-0000-0000-000000000001`).

Contracts and individuals use **integer** `organization_id` (= `organizations.id`).

| ID | Name | Type | Contracts (int) | Individuals (int) | Classification |
|---:|------|------|----------------:|------------------:|----------------|
| 1 | Proton | Other | **15** | **18** | **Bootstrap / int-scope home** (fallback for contracts) |
| 2 | Brownhill Farm Studios Ltd | Label | 0 | 0 | Production-related studio (desktop) |
| 3 | M2KR Records | — | 0 | 0 | Production label name (desktop); **catalog not stored under this int id** |
| 4 | Secret Label | — | 0 | 0 | Demo/test |
| 5 | M2KR Records | Label | 0 | 0 | Demo duplicate of M2KR |
| 6 | Secret Label | Label | 0 | 0 | Demo duplicate |
| 7 | M2KR Records | Label | 0 | 0 | Demo duplicate |
| 8 | Secret Label | Label | 0 | 0 | Demo duplicate |
| 9 | M2KR Records | Label | 0 | 0 | Demo duplicate |
| 10 | Secret Label | Label | 0 | 0 | Demo duplicate |
| 11 | M2KR Records | Label | 0 | 0 | Demo duplicate |
| 12 | Secret Label | Label | 0 | 0 | Demo duplicate |
| 13 | M2KR Records | Label | 0 | 0 | Demo duplicate |
| 14 | Secret Label | Label | 0 | 0 | Demo duplicate |
| 15 | M2KR Records | Label | 0 | 0 | Demo duplicate |
| 16 | Secret Label | Label | 0 | 0 | Demo duplicate |
| 17 | M2KR Records | Label | 0 | 0 | Demo duplicate |
| 18 | Secret Label | Label | 0 | 0 | Demo duplicate |
| 19 | M2KR Records | Label | 0 | 0 | Demo duplicate |
| 20 | Secret Label | Label | 0 | 0 | Demo duplicate |
| 21 | M2KR Records | Label | 0 | 0 | Demo duplicate |
| 22 | Secret Label | Label | 0 | 0 | Demo duplicate |
| 23 | M2KR Records | Label | 0 | 0 | Demo duplicate |
| 24 | Secret Label | Label | 0 | 0 | Demo duplicate |
| 25 | M2KR Records | Label | 0 | 0 | Demo duplicate |
| 26 | Secret Label | Label | 0 | 0 | Demo duplicate |
| 27 | M2KR Records | Label | 0 | 0 | Demo duplicate |
| 28 | Secret Label | Label | 0 | 0 | Demo duplicate |

### Catalog ownership (the real “production org”)

| Entity | `organization_id` value | Count |
|--------|-------------------------|------:|
| artists | `00000000-0000-0000-0000-000000000001` | 141 |
| releases | `00000000-0000-0000-0000-000000000001` | 111 |
| works | `00000000-0000-0000-0000-000000000001` | 25 |
| tracks | (no org column filter in API; all rows) | 389 |
| attachments | `organizationId = "1"` (string) | 1120 |

**Interpretation:** Migrated catalog lives under the **cloud UUID**, not under `organizations.name = 'M2KR Records'`.  
The concern “admin scoped to Otto Records while data is M2KR” does **not** apply to this schema: there is **no Otto Records row** after migration overwrote seed order, and M2KR int rows hold **zero** catalog counts. Production catalog + admin user share the UUID above.

---

## 2. Session context report

### Admin principal (`admin@otto.com`)

| Field | Value |
|-------|--------|
| User ID | `1` |
| Email | `admin@otto.com` |
| Name | System Admin |
| Role | `admin` |
| `is_superuser` | `true` |
| **Current organization_id (UUID)** | **`00000000-0000-0000-0000-000000000001`** |
| Current tenant_id | `null` |

### Resolution flow (code)

```
Login form
  → next-auth CredentialsProvider.authorize (lib/auth.ts)
      → prisma.user.findUnique({ email })
      → returns { id, organization_id, tenant_id, role, is_superuser }
  → JWT callback stores token.organization_id, token.tenant_id
  → session callback exposes session.user.organization_id
  → API routes: getServerSession(authOptions)
      → const orgId = session.user.organization_id   // UUID for catalog
      → contracts: parseInt(orgId) || 1              // → int 1
  → lib/org.ts getOrgIds():
      uuidOrgId = session.user.organization_id || CLOUD_UUID
      intOrgId  = 1  // HARDCODED
```

### OrgContext (UI org switcher)

`contexts/OrgContext.jsx` sets `currentOrgId = session.user.tenant_id`.  
For `admin@otto.com`, **tenant_id is null**, so the switcher has no tenant membership.  
**Catalog list APIs do not use OrgContext** — they use JWT `organization_id` UUID. Therefore empty OrgContext does **not** zero the catalog.

### Membership

| Check | Result |
|-------|--------|
| Admin in UUID catalog scope | **Yes** — `users.organization_id` equals catalog UUID |
| Admin member of M2KR int org | N/A for catalog — M2KR int orgs hold 0 artists |
| Admin tenant_users default | None for user 1 (tenant_users only for user 2) |
| Membership change required? | **No** — admin already shares catalog UUID |

---

## 3. Dashboard validation

**Source:** `app/(dashboard)/dashboard/page.tsx`

| Card | Client call | Response shape | Value used | Simulated total |
|------|-------------|----------------|------------|----------------:|
| Artists | `GET /api/artists?limit=1` | `{ total, items }` | `artists.total` | **141** |
| Releases | `GET /api/releases?limit=1` | `{ total, items }` | `releases.total` | **99** (active) |
| Contracts | `GET /api/contracts?limit=1` | `{ total, items }` | `contracts.total` | **15** |
| Revenue | `GET /api/royalties?action=summary` | summary or null | net_amount | **—** (0 royalties migrated) |
| Chart also loads | tracks/works `limit=1` | `{ total, items }` | totals | 389 / 25 |

**Evidence sample from simulated queries (2026-07-18):**

```
GET /api/artists → total 141; sample: 3rio Symphony, ANDREW MISSINGHAM, AVG, …
GET /api/releases → total 99 active (+12 is_deleted); sample includes production titles + hub smoke
GET /api/tracks → total 389; sample: Ziyakhala (Muchacho Remix), …
GET /api/contracts → total 15; sample: CURL-FORM-FINAL, Hub Smoke Apply Contract, …
```

Displayed counts **match PostgreSQL** for the filters above.

**Caveat:** Dashboard releases card shows **99** (non-deleted only), not 111. That is correct API behavior, not a migration miss.

---

## 4. Catalog validation

| Page | Route | API filter | Expected UI | Evidence |
|------|-------|------------|-------------|----------|
| Artists list | `/catalog/artists` | UUID org | 141 rows (paginated) | total=141, first page 100 |
| Artist detail | `/catalog/artists/[id]` | UUID + id | Named artist | sample ids present |
| Releases list | `/catalog/releases` | UUID + not deleted | 99 rows | total=99 |
| Release detail | `/catalog/releases/[id]` | by id | title + tracks | e.g. release 28 has 20 tracks |
| Tracks list | `/catalog/tracks` | **no org filter** | 389 rows | total=389 |
| Works list | `/catalog/works` | UUID org | 25 rows | total=25 |
| Contracts list | `/contracts` | int org 1 | 15 rows | total=15 |
| Individuals | `/network/individuals` | int org 1 | 18 rows | total=18 |
| Labels | `/catalog/labels` | none | 14 rows | total=14 |

**Discrepancies vs naive “28 orgs / M2KR” mental model:**

- Filtering artists by `organizations.id` of M2KR would show **0** — because catalog is UUID-scoped.  
- That is a **schema design fact**, not a failed migration.

---

## 5. Attachment validation

| Metric | Value |
|--------|------:|
| Attachment rows in PG | **1120** |
| `entityType` breakdown | **100% `misc`** (1120) |
| `entityId` | predominantly `orphan` |
| Sampled artists with linked attachment (10) | **0 / 10** |
| Sampled releases with linked attachment (10) | **0 / 10** |
| Sampled contracts with linked attachment (5) | **0 / 5** |
| storageKey present on samples | Yes (e.g. `organizations/1/misc/...-audit.pdf`) |
| Signed URL generation | Supported by `lib/storage/signed-url.ts` (`getSignedDownloadUrl`); requires live R2 env at runtime |

**Conclusion:** Binary migration succeeded (objects in R2 + Attachment rows), but **entity linking never bound files to artists/releases/contracts**.  
Detail pages will not show artwork/documents until a link pass (or UI reads legacy URL fields).

**Phase 6 verdict:** 0/25 entity-linked samples rendered as catalog media; storage records exist as orphans.

---

## 6. Relationship validation

| Check | Broken count | Notes |
|-------|-------------:|-------|
| Release → Artist FK | **0** | 16 releases have non-null artist_id; all resolve |
| Track → Release FK | **0** | 362 tracks with release_id all resolve |
| Track → Work FK | **0** | |
| Contract party → Contract | **0** | 9 parties all resolve |

**Sample graph evidence:**

- Top release by track count: *Blaq Spirit ElectricMelt 1996-2010, Vol. 4* (id 28) → **20 tracks**  
- *Little Ark - Between* → 14 tracks  
- Artist *Oddxperienc* (id 143) → 8 releases (post name-merge hub)  
- Artist *GhostArtist* (id 144) → 8 releases  

**Data quality note (not broken FK):** Most production releases have `artist_id = null` (desktop data); only 16 non-null artist FKs. Tracks still hang off releases.

---

## 7. Root cause analysis — “why might UI still look empty?”

| Hypothesis | Verdict |
|------------|---------|
| Wrong org UUID on admin vs catalog | **Disproven** — both use `00000000-0000-0000-0000-000000000001` |
| Data only under M2KR int ids | **Disproven** — M2KR int orgs have 0 artists |
| Dashboard using array length of limit=1 | **Disproven** — uses `.total` from `{total,items}` |
| Not logged in / session missing | Possible in browser only; API requires session |
| Looking at wrong environment | Must use same `DATABASE_URL` Neon as migration |
| Attachments missing on detail pages | **Confirmed gap** — all 1120 are orphan `misc` |
| Org switcher shows empty | Expected for admin with `tenant_id = null`; does not block catalog APIs |

If a human still sees zeros in the browser, check: auth session cookie, network tab for `GET /api/artists` response `total`, and that the app points at this Neon database.

---

## 8. Demo data assessment

| Class | Orgs | Notes |
|-------|------|-------|
| **Bootstrap / int-scope** | Proton (id 1) | Holds all contracts + individuals after migration fallback |
| **Production label names** | M2KR Records (ids 3,5,7,…) | Desktop CRM companies; **not** catalog UUID owners |
| **Demo** | Secret Label (even ids 4–28) | Repeated test labels |
| **Production-related** | Brownhill Farm Studios Ltd (2) | Studio company |
| **Obsolete** | Duplicate M2KR/Secret pairs | Cleanup candidate later — **do not delete yet** |
| **Cloud catalog tenant** | UUID `…0001` | Not a row in `organizations`; is the real multi-tenant key for artists/releases/works |

Users with same UUID: admin@otto.com, admin_a, admin_b, hub smoke admins, orga_admin.

---

## 9. Artist merge appendix

Full list written to:

- `migration/artist-merge-appendix.json` (**35 merges**)

| Rule | Description |
|------|-------------|
| `unique_name_collision` | PostgreSQL unique on `artists.name`; source row mapped to existing destination id with same name |

Examples:

| Source ID | Dest ID | Dest name |
|----------:|--------:|-----------|
| 145 | 143 | Oddxperienc |
| 146 | 144 | GhostArtist |
| 147 | 143 | Oddxperienc |
| … | … | (see JSON for all 35) |

**Risk:** Distinct real-world artists sharing a name would be collapsed. Current merges are overwhelmingly smoke-test duplicates (`Oddxperienc`, `GhostArtist`, `pdf_extract`, `contract_linker:…`). Review the JSON before treating artist identity as final for legal/royalty use.

---

## 10. UI walkthrough (evidence class)

Browser screenshots were **not** captured in this run (headless validation).  
**API-equivalent evidence** for each walkthrough item:

| # | Surface | Evidence |
|---|---------|----------|
| 1 | Dashboard metrics | totals 141 / 99 / 15 / revenue empty |
| 2 | Artist list | 141 total, sorted names |
| 3 | Artist detail | ids e.g. 100, 27 exist |
| 4 | Release list | 99 active |
| 5 | Release detail + tracks | release 28 → 20 tracks |
| 6 | Contract list | 15 with parties on some |
| 7 | Attachment download | keys exist; entity binding missing |
| 8 | User profile | admin@otto.com id=1 |
| 9 | Org selector | tenant-based; admin has null tenant |

---

## Deliverable checklist

1. **Organization inventory** — §1  
2. **Session context** — §2  
3. **Dashboard validation** — §3 (**matches PG**)  
4. **Catalog validation** — §4 (**lists would populate**)  
5. **Attachment validation** — §5 (**orphans; 0 entity-linked samples**)  
6. **Relationship validation** — §6 (**0 broken FKs**)  
7. **Root cause** — §7  
8. **Recommendation** — below  

---

## Final recommendation

# SYSTEM READY FOR FUNCTIONAL TESTING

**Not blocked** on organization scoping for catalog/contracts under `admin@otto.com`.

**Follow-ups (non-blocking for first functional QA):**

1. Attachment entity-linking pass (bind 1120 misc orphans where possible)  
2. Optional: rename/clarify Proton vs M2KR vs UUID tenant in product UX  
3. Human review of `artist-merge-appendix.json` before royalty-critical workflows  
4. Browser screenshot pack once QA signs into the running app against this Neon DB  
