# Artist Groups for Contracts + Bulk Processing v1

## Implementation Plan — Non-breaking, Governed

---

## Phase 1: Data Model (Backend)

### 1A. Add `artist_kind` column to `artists` table

**File:** `backend/models/artist.py`

- Add column: `artist_kind = Column(String(20), default="solo", nullable=False)`
  - Values: `solo` | `group`
- SQLite default: `"solo"` (all existing artists remain solo)

### 1B. Create `artist_memberships` join table

**File:** `backend/models/artist_membership.py` (NEW)

```python
class ArtistMembership(Base):
    __tablename__ = "artist_memberships"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("artists.id"), nullable=False, index=True)
    member_id = Column(Integer, ForeignKey("artists.id"), nullable=False, index=True)
    organization_id = Column(SafeUuid, nullable=True, index=True)
    role = Column(String(100))  # e.g. "vocalist", "producer" (optional)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('ix_membership_group_member', 'group_id', 'member_id', unique=True),
    )
```

### 1C. Add relationships to `Artist` model

```python
# In Artist model:
memberships_as_group = relationship(
    "ArtistMembership",
    foreign_keys="ArtistMembership.group_id",
    backref="group",
    cascade="all, delete-orphan"
)
memberships_as_member = relationship(
    "ArtistMembership",
    foreign_keys="ArtistMembership.member_id",
    backref="member"
)
```

### 1D. Alembic migration

**File:** `backend/alembic/versions/XXXX_add_artist_groups.py` (NEW)

- `op.add_column("artists", sa.Column("artist_kind", sa.String(20), server_default="solo", nullable=False))`
- `op.create_table("artist_memberships", ...)`

### 1E. Update schemas

**File:** `backend/schemas/artist.py`

- Add `artist_kind: Optional[str] = "solo"` to `ArtistBase`
- Add `artist_kind: Optional[str] = None` to `ArtistUpdate`
- Add `members: Optional[list] = None` to `Artist` response schema
- Add `member_preview: Optional[list] = None` to `Artist` response schema

---

## Phase 2: Backend API Endpoints

### 2A. Artist Group CRUD

**File:** `backend/routes/catalog.py` — extend existing artist endpoints

#### `POST /api/artists` — Updated
Accept optional fields:
```json
{
  "name": "Trio Symphony",
  "artist_kind": "group",
  "member_ids": [201, 202, 203]
}
```
If `artist_kind == "group"` and `member_ids` provided, create membership rows.

#### `GET /api/artists/{id}` — Updated
Include `members` array when artist_kind is "group":
```json
{
  "id": 101,
  "name": "Trio Symphony",
  "artist_kind": "group",
  "members": [
    {"id": 201, "name": "Tabang Magaba", "role": null},
    {"id": 202, "name": "Tyrone Stembiso", "role": null},
    {"id": 203, "name": "Stembiso Kekana", "role": null}
  ]
}
```

#### `PATCH /api/artists/{id}` — Updated
Accept `member_ids` to update group membership.

#### `POST /api/artists/{id}/members` — NEW
Add a member to a group.
```json
{"member_id": 204, "role": "vocalist"}
```

#### `DELETE /api/artists/{id}/members/{member_id}` — NEW
Remove a member from a group.

### 2B. Party search — return group display string

**File:** `backend/routes/contracts.py`

Update `contracts_party_search` and `party_lookup`:
- When result is an artist with `artist_kind == "group"`, include:
  - `"kind": "group"`
  - `"display": "Trio Symphony (Tabang, Tyrone, Stembiso)"`
  - `"member_preview": [{"id": 201, "name": "Tabang Magaba"}, ...]`
- When result is `artist_kind == "solo"`, include:
  - `"kind": "solo"`
  - No `member_preview`

### 2C. Contracts list — parties_summary

**File:** `backend/routes/contracts.py`

Update `_serialize_contract_item` to include `parties_summary`:
```python
{
  "parties_summary": {
    "count": len(contract.parties),
    "items": [
      {
        "party_type": party.entity_type,
        "artist_id": party.entity_id if party.entity_type == "artist" else None,
        "kind": artist.artist_kind if artist else None,
        "name": display_name,
        "display": display_with_members,
        "member_preview": members_list
      }
      for party in contract.parties
    ]
  }
}
```

### 2D. Contract search — optional member-to-group inclusion

**File:** `backend/routes/contracts.py`

Add query param to `list_contracts`:
- `include_group_contracts_for_member_matches: bool = False`
- When `True` and `q` matches a member name, also return contracts where the member's group is a party

---

## Phase 3: Frontend Changes

### 3A. Contracts List — Parties column

**File:** `frontend/src/pages/Contracts.jsx` and `ContractsList.jsx`

- Render parties using `parties_summary.items`
- For groups: show `"Group Name (Group)"` with tooltip showing members
- Use `title` attribute or custom tooltip component

### 3B. Contracts List — member search toggle

- Add checkbox: `"Include groups members belong to"`
- Sends `include_group_contracts_for_member_matches=true` query param

### 3C. Party typeahead — GROUP badge

**File:** `frontend/src/components/contracts/EntityTypeahead.jsx`

- Display group results as: `"Trio Symphony (Tabang, Tyrone, Stembiso)"` with `GROUP` badge
- Use `display` from backend for consistent formatting

**File:** `frontend/src/components/contracts/PartyMultiAssign.jsx`

- Same display logic for bulk processing party assignment
- Add group badge when `kind === "group"`

### 3D. Bulk Processing — Group helper

**File:** `frontend/src/components/contracts/BulkContractCard.jsx`

- When extraction signals `aka_group_name` + `member_candidates`:
  - Show helper: "Create Group 'Trio Symphony' with members: Tabang, Tyrone, Stembiso?"
  - User action required (governance — no auto-create)
  - On confirm, call `POST /api/artists` with `artist_kind: "group"` and `member_ids`

### 3E. Catalog Artist pages — Group support

**File:** `frontend/src/pages/catalog/ArtistDetail.jsx` (or similar)

- Show "Members" section when `artist_kind === "group"`
- Allow adding/removing members
- Show `GROUP` badge on artist name

**File:** `frontend/src/pages/catalog/Artists.jsx`

- Show `GROUP` or `SOLO` badge in artist list
- Filter by kind

---

## Phase 4: Evidence & Tests

### 4A. Backend tests

- Group creation
- Member add/remove
- Party search returns group display + member preview
- Contract list includes parties_summary
- Org isolation (group in org A not visible in org B)

### 4B. Evidence script update

**File:** `backend/scripts/generate_contracts_bulk_ui_evidence.sh`

Add tests for:
- Group creation endpoint
- Search returning group + member preview
- Contract list response showing display
- Org isolation

### 4C. Invariant check

- Run: `python3 backend/invariant_check.py`
- Run: `HOME=$(mktemp -d) pytest -q`
- Run: `cd frontend && npm run build`

---

## Implementation Order

1. Phase 1A-1D: Data model + migration
2. Phase 2A-2B: Artist CRUD + party search updates
3. Phase 2C-2D: Contracts list + search updates
4. Phase 3A-3B: Contracts list frontend
5. Phase 3C-3D: Party typeahead + bulk processing
6. Phase 3E: Catalog consistency
7. Phase 4: Tests + evidence

---

## Non-Breaking Guarantees

- `artist_kind` defaults to `"solo"` — all existing artists unchanged
- New `artist_memberships` table is additive
- All existing API responses unchanged — `parties_summary` is a NEW field
- `include_group_contracts_for_member_matches` defaults to `false`
- No automatic group creation from AI extraction

---

## Files to Create/Modify

### New Files
- `backend/models/artist_membership.py`
- `backend/alembic/versions/XXXX_add_artist_groups.py`

### Modified Files
- `backend/models/artist.py` — add `artist_kind`, relationships
- `backend/models/__init__.py` — register new model
- `backend/schemas/artist.py` — add fields
- `backend/routes/catalog.py` — artist CRUD updates, member endpoints
- `backend/routes/contracts.py` — party search display, parties_summary, member toggle
- `frontend/src/pages/Contracts.jsx` — parties column, member toggle
- `frontend/src/pages/admin-of-works/ContractsList.jsx` — parties column
- `frontend/src/components/contracts/EntityTypeahead.jsx` — group badge
- `frontend/src/components/contracts/PartyMultiAssign.jsx` — group badge + display
- `frontend/src/components/contracts/BulkContractCard.jsx` — group helper
- `frontend/src/pages/catalog/Artists.jsx` — group badge
- `frontend/src/pages/catalog/ArtistDetail.jsx` — members section
