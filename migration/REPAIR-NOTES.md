# Migration Repair Notes (2026-07-18)

## Issues fixed

### Artists (176 readable → 141 cloud rows)
- **Cause:** unique `name` constraint; smoke-test duplicates (`Oddxperienc`, `GhostArtist`, `pdf_extract`, …)
- **Fix:** on unique collision, map source id → existing cloud artist by name (`id-map.json` has 35 cross-maps e.g. `145→143`)
- **Result:** all relationship FKs resolve; dashboard shows 141 distinct artists

### Releases (111/111)
- **Cause:** FKs to unmapped artists; unique UPC collisions; 12 column-shifted corrupt rows (contract JSON mixed into release fields)
- **Fix:** artist id-map remap; null unique junk; corrupt rows imported as `is_deleted` placeholders with synthetic titles
- **Result:** 111/111 pass

### Contracts (15/15) + parties (9/9)
- **Cause:** `organization_id` values not present in `organizations` (test orgs `41216`, snowflake ids beyond PostgreSQL INTEGER)
- **Fix:** INT org fallback to org `1` (Proton) when unmapped/oversize; map recorded in id-map
- **Note:** SQLite `COUNT(*)` on this backup is corrupt (reports 24); materializing rows yields 15 real contracts — all migrated

### Individuals (18/18)
- **Cause:** same orphan org_id issue
- **Fix:** org fallback; full re-import

## Engine improvements
- `--table` / `--force` repair mode without wiping full state
- Unique-name artist mapping
- Orphan/oversize org fallback for INT_ORG models
- Corrupt release row detection
- Validation uses row materialization (not inflated COUNT on corrupt indexes)
