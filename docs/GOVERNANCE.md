# OTTO Governance Covenant (Source of Truth)

## Prime rule
No ADE may add/move folders, introduce parallel systems, or change DB location logic unless explicitly instructed in a Work Order.

## Repo layout (authoritative)
- backend/ = FastAPI backend
- frontend/ = UI
- installer/ = packaging only (frontend dist + backend binary + electron launcher)

## Database single source of truth
Canonical data dir:
- macOS: ~/Library/Application Support/OTTO
- Windows: %APPDATA%\OTTO
- Linux: ~/.config/OTTO

Canonical DB path:
- ${OTTO_DATA_DIR}/db/otto.sqlite

Forbidden:
- any DB files inside repo (backend/app.db, backend/otto.db, etc.)

## Ports
No fixed ports. Must pick free ports dynamically for:
- local control server
- backend server
- proxy server

## Dependencies
Single source of truth:
- backend/requirements.txt
Governed by:
- backend/governance_check.py

## Change control
All changes must follow docs/ADE_WORK_ORDER.md and pass:
- python backend/governance_gate.py

## Governance Enforcement (Machine-Checked)

This repo is protected by executable governance checks. Any change by an ADE (or any developer) MUST pass the governance gate before it is considered valid.

### Mandatory command (run before commit / build / handoff)
```bash
bash scripts/run_governance.sh
```

### Guardrails Enforcement

We use automated checks to prevent drift and ensure system integrity.

1.  **Source of Truth**:
    - **One Database**: `~/.otto/data/db/otto.sqlite` (macOS/Linux) or `%APPDATA%\OTTO\db\otto.sqlite` (Windows). No other DB files allowed.
    - **One Dependency List**: `backend/requirements.txt`.

2.  **No New Folders / No New Storage Roots**:
    - The directory structure is fixed. Do not create new top-level folders without authorization.

3.  **Every Change Requires Scope**:
    - You must set `OTTO_CHANGE_SCOPE` (e.g., `contracts`, `catalog`) when running governance checks.
    - Changes outside the allowed file patterns for that scope will fail standard checks.

4.  **Run Governance**:
    - Always run `scripts/run_governance.sh` before pushing code.
