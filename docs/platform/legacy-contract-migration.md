# Legacy Contract Schema — Decommission Plan

| Field | Value |
|-------|--------|
| **Status** | Scheduled (exit plan documented; execution not started) |
| **Priority** | High |
| **Owner** | Platform (with module owners for AI, Royalties, Releases) |
| **Target** | After Contract Center reaches parity; **before** hard deletion |
| **Related** | [Audit UUID migration](./work-items/audit-system-uuid-migration.md), ADR-001, Contract Center roadmap |

---

## Purpose

Contract Center is the long-term product surface for legal agreements. The **legacy contract schema** remains in production today because multiple subsystems still depend on it.

This document is the **formal exit plan**: a documented path from “legacy remains” to “legacy deleted,” without implying that deletion is safe today.

---

## Current reality (explicit)

| Fact | Implication |
|------|-------------|
| **Legacy contracts remain** | `contracts` + child tables (`contract_parties`, `contract_documents`, `contract_assets`, `contract_split_groups`, `contract_splits`, `contract_track_links`, …) are still live |
| **AI depends on them** | Resolution, attach, core-write, release-integration, and related AI tables reference `contract_id` / contract documents |
| **Royalties depend on them** | Royalty APIs and simulations accept / store `contract_id` against legacy contracts |
| **Releases depend on them** | Release integration and attach flows link releases to legacy contract ids |

These dependencies are **intentional for now**. Do not delete or freeze legacy writes until the exit stages below are complete.

---

## Legacy contract tables (inventory)

Primary aggregate and children (INT `organization_id` unless noted):

| Table | Role |
|-------|------|
| `contracts` | Root agreement (int PK, int `organization_id`) |
| `contract_parties` | Parties / roles / splits metadata |
| `contract_documents` | File versions, checksums, paths |
| `contract_assets` | Work / track / release scope |
| `contract_split_groups` | Named split blocks |
| `contract_splits` | Percentages per party |
| `contract_track_links` | Track linkage (`organization_id` already UUID on this table) |
| `contract_intake_release_links` | Intake → release bridge |

Downstream / AI (non-exhaustive; all must be inventoried before deletion):

| Area | Examples |
|------|----------|
| AI | `ai_contract_*`, `ai_core_write_*`, `ai_release_integration_*`, `ai_royalty_simulation_runs`, `ai_contract_work_links` |
| Royalties | Royalty rows / sim runs keyed by `contract_id` |
| Catalog / releases | Enrichment and attach paths that join on legacy contract ids |
| Office / reports | Contract audit / completeness reports |

Canonical product direction: UUID-scoped Contract Center entities (see product docs). Legacy remains the **system of record** until migration stages complete.

---

## Exit path (ordered)

```
Legacy Contract Tables
        ↓
   AI migration
        ↓
 Relationship migration
        ↓
  Royalty migration
        ↓
    Validation
        ↓
  Data migration
        ↓
Read-only compatibility
        ↓
     Deletion
```

Each stage has **entry criteria**, **work**, and **exit criteria**. Do not skip stages.

---

### Stage 0 — Baseline freeze (documentation)

| | |
|--|--|
| **Entry** | This document accepted as baseline |
| **Work** | Keep inventory current; no production deletion; Contract Center builds in parallel |
| **Exit** | All consumers listed; dual-write policy agreed |

---

### Stage 1 — AI migration

| | |
|--|--|
| **Entry** | Contract Center identity model stable (UUID org + stable contract ids) |
| **Work** | Point AI extract / resolve / attach / core-write / release-integration at Contract Center ids (or dual-key with explicit mapping table) |
| **Exit** | No AI write path that *only* understands legacy int `contract_id` without a mapping; AI audit logs reference new ids |

**Owner:** Platform + AI

---

### Stage 2 — Relationship migration

| | |
|--|--|
| **Entry** | AI can resolve against new contract ids |
| **Work** | Migrate parties, assets, track links, split groups/splits, release links to Contract Center relationship model |
| **Exit** | UI and APIs for relationships read/write Contract Center; legacy relationships not required for day-to-day ops |

**Owner:** Contract Center + Platform

---

### Stage 3 — Royalty migration

| | |
|--|--|
| **Entry** | Contract + party/split model stable on Contract Center |
| **Work** | Royalty statements, simulations, and any `contract_id` FKs point at new contracts (or map 1:1) |
| **Exit** | Royalty calculation and reporting do not query legacy tables for active orgs |

**Owner:** Royalties + Platform

---

### Stage 4 — Validation

| | |
|--|--|
| **Entry** | Stages 1–3 complete for pilot org(s) |
| **Work** | Row counts, checksum samples, completeness scores, multi-org isolation proofs, AI/royalty/release smoke packs |
| **Exit** | Signed validation report; zero unexplained diffs for pilot orgs |

**Owner:** Platform

---

### Stage 5 — Data migration (full fleet)

| | |
|--|--|
| **Entry** | Validation signed |
| **Work** | Batch migrate remaining orgs; maintain id map (`legacy_contract_id` → `contract_center_id`); dual-write if needed during cutover window |
| **Exit** | 100% of active org contracts present in Contract Center; map table complete |

**Owner:** Platform

---

### Stage 6 — Read-only compatibility

| | |
|--|--|
| **Entry** | Full data migration complete |
| **Work** | Legacy tables/APIs become **read-only**; all writes go to Contract Center; keep legacy UI route only if needed (`/legacy-contracts` deprecated) |
| **Exit** | No production write hits legacy tables; monitoring confirms |

**Owner:** Platform

---

### Stage 7 — Deletion

| | |
|--|--|
| **Entry** | Read-only period completed (minimum soak agreed with product); no remaining code paths; backups retained |
| **Work** | Drop legacy tables / dead API surface; remove `legacyIntOrgId` usage for contracts; update ADR and technical debt |
| **Exit** | Legacy schema removed from Prisma and DB; docs mark decommission **complete** |

**Owner:** Platform

---

## Guardrails

1. **Do not delete** while AI, royalties, or releases still hard-depend on legacy ids.
2. **Do not block** Contract Center Milestone 2 (document management) on this decommission.
3. **Do not** implement this plan *inside* the Contract module alone — consumers span platform, AI, royalties, and releases.
4. Prefer an explicit **id map table** over silent `parseInt` / UUID hacks.
5. Audit correctness is separate: see [audit-system-uuid-migration.md](./work-items/audit-system-uuid-migration.md) (must land before production regardless of this plan’s stage).

---

## Dependency matrix (who must move before deletion)

| Consumer | Depends on legacy? | Migration stage |
|----------|--------------------|-----------------|
| Contract Center product UI | Dual-run until cutover | 2, 5, 6 |
| AI contract intelligence | Yes | 1 |
| Release attach / integration | Yes | 1–2 |
| Royalties / simulations | Yes | 3 |
| Reports (`contracts_audit`) | Yes | 2–5 |
| Platform audit_logs | Org id type issue | Parallel work item |

---

## Success definition

The legacy schema is **gone**, and:

- Contract Center is the only system of record for agreements
- AI, royalties, and releases use Contract Center identifiers
- Org isolation is UUID-consistent end-to-end
- Historical data is retained via migration + backups, not live legacy tables

---

## References

- `prisma/schema.prisma` — `contracts`, `contract_*`, AI contract tables
- [multi-tenant-model.md](../architecture/multi-tenant-model.md) §4.2 INT-scoped entities
- [organization-context-technical-debt.md](../architecture/organization-context-technical-debt.md)
- [CONTRACT_SYSTEM_V1.md](../../CONTRACT_SYSTEM_V1.md) (historical; legacy marked read-only in product intent)
- [Contract Center roadmap](../product/contract-center/ROADMAP.md)
)
