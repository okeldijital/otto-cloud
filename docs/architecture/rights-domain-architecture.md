# Rights Domain Architecture

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **Package** | `lib/rights` |
| **ADR** | [ADR-020](../product/rights/adr-020-rights-domain.md) |

---

## Position

```
Verified Contract → Rights Promotion → Review → Registry → Platform Events → Royalties
```

---

## Models

| Model | Role |
|-------|------|
| `Right` | Registry SoT for operational rights |
| `RightGrant` | Exclusive / assignable / sublicensable flags |
| `RightRestriction` | Territory, platform, media, time, … |
| `RightParty` / `RightTerritory` | Parties and territories |
| `RightWork` / `RightRelease` | Optional entity links |
| `RightContractReference` | Traceability to contracts |
| `RightCandidate` | Pre-approval candidates |
| `RightPromotionRun` | Promotion batch |
| `RightHistory` / `RightTimelineEntry` | Audit |

---

## Services

| Service | Role |
|---------|------|
| `RightsPromotionService` | Candidates from verified contracts |
| `RightsReviewService` | Approve / reject |
| `RightsRegistryService` | CRUD read/update on registry |
| `RightsLifecycleService` | Validated status transitions |
| `RightsSearchService` | Search / filter |
| `RightsDashboardService` | Cards |
| `RightsTimelineService` | Timeline |

---

## APIs

| Method | Path |
|--------|------|
| GET | `/api/rights` |
| GET/PATCH | `/api/rights/:id` |
| GET | `/api/rights/search` |
| GET | `/api/rights/dashboard` |
| GET/POST | `/api/rights/review` |
| POST | `/api/rights/promote` |
| POST | `/api/rights/replay` |
| GET | `/api/rights/:id/timeline` |
| GET | `/api/rights/:id/contracts` |
| GET | `/api/rights/:id/relationships` |

---

## Events

`rights.candidate.created` · `rights.review.completed` · `rights.created` · `rights.updated` · `rights.activated` · `rights.expired` · `rights.assigned` · `rights.transferred` · `rights.restricted` · `rights.superseded` · `rights.terminated`

---

## Out of scope

Royalty calculations · payments · accounting · DSP · AI clause interpretation · licensing workflows.
