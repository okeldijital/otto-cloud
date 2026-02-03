# Contract Migration Notes (V1 Rollout)

## 1. Migration Strategy: "Hard Reset"
Due to severe schema drift and lack of referential integrity in the legacy system, we opted for a clean break. The new `contracts_v1` tables were created fresh. No data was automatically migrated to avoid corrupting the new strict schema.

## 2. Technical Challenges & Fixes

### A. The "Distributors" Deadlock
- **Issue**: The `distributors` table was locked by a circular foreign key dependency with `releases`.
- **Fix**: Manually dropped the table cascade locally to break the lock, then patched migration scripts to reflect this state.

### B. SQLite vs Postgres UUIDs
- **Issue**: Alembic migrations generated `UUID` columns using `sqlalchemy.dialects.postgresql.UUID`. This caused valid migrations to fail test suites running on SQLite.
- **Fix**: Patched `conftest.py` with a custom `SQLiteCompiler` rule to render `UUID` as `CHAR(36)`.
- **Lesson**: Use `sqlalchemy.types.Uuid` (Standard) in future models for better cross-db compatibility.

### C. Missing Column Migrations
- **Issue**: Legacy migration `fed736b8485d` failed because it tried to index a missing `catalog_number` column.
- **Fix**: Manually patched the migration file to add the column before indexing.

## 3. Manual Steps Required on Production
1. **Verify `distributors` dependency**: If production Postgres has the `distributors` table, verify if `releases` FK constraint needs dropping manually before applying `7e0f57e495a3`.
2. **Run Upgrade**: `alembic upgrade head`.

## 4. Future Data Migration
A script will be needed to map essential metadata from `contracts` (JSON) to `contracts_v1` (Relational). This is blocked until human review of legacy data quality.
