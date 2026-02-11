docs/GOVERNANCE.md

OTTO ADE COVENANTS & GUARDRAILS (V1.0.0)

0. Mission

Your job is to implement the requested change while preserving governance, data safety, and repository structure. If a change introduces ambiguity (multiple DBs, ports, entrypoints, installers), do not implement it until governance is updated.

⸻

1. Non-Negotiables (Hard Rules)
	1.	Single Source of Truth paths
	•	Canonical data dir: ~/.otto/
	•	Canonical DB: ~/.otto/data/db/otto.sqlite
	•	Any other DBs are legacy and must not be used.
	2.	No new folder trees without approval
	•	No new top-level directories.
	•	No duplicated structures.
	3.	No alternative runtimes or build systems
	4.	No silent breaking changes
	•	DB, ports, auth, backups, routing require docs + migration/tests.
	5.	No fixed port drift
	•	Ports resolved from config only.
	6.	No data loss
	•	Destructive ops require backup + audit + rollback.

⸻

2. Repo Structure (Stable)
	•	backend/ – FastAPI, DB, backup/restore, governance
	•	frontend/ – UI (relative /api only)
	•	installer/ – Electron launcher + bundled artifacts
	•	docs/ – Specs and governance

Forbidden: duplicate roots, shadow installers, parallel backends.

⸻

3. Configuration (Single Truth)

Resolution order:
	1.	~/.otto/config.json
	2.	Env vars (dev/CI only)
	3.	Defaults

Required keys:
	•	OTTO_NODE_ROLE: hub | spoke | unconfigured
	•	OTTO_DATA_DIR
	•	OTTO_DB_PATH
	•	OTTO_APP_PORT
	•	OTTO_BACKEND_PORT

⸻

4. Database Governance
	•	Backend logs resolved DB path, role, schema version on startup.
	•	Non-canonical DB paths are rejected unless dev override.
	•	All schema changes via Alembic.

⸻

5. Backup & Restore Governance

Backup ZIP must include:
	•	db/otto.sqlite
	•	meta.json (timestamp, schema, role, checksum)

Restore must: validate → pre-backup → atomic swap → audit log.

API endpoints must be real APIs (never SPA fallthrough).

⸻

6. Local Networking
	•	Safe port selection, logged clearly.
	•	Backend binds to 127.0.0.1 only.
	•	Health endpoint: GET /health.

⸻

7. Installer Covenant
	•	Bundled backend must be executable.
	•	First run launches /setup wizard to choose Hub/Spoke.
	•	Wizard writes config and restarts cleanly.

⸻

8. Change Control

Every task includes:
	1.	Scope
	2.	Files touched
	3.	Acceptance tests

Mandatory: governance check + smoke tests.

⸻

9. Security
	•	No secrets in logs or repo.
	•	Hub pulls only; spokes never push.

⸻

10. Immediate Governance Fixes
	•	Enforce canonical DB
	•	Fix backup upload routing
	•	Atomic restore with logs
	•	Dynamic ports
	•	Executable permissions in installer

⸻

docs/ADE_WORK_ORDER.md

ADE Work Order Template (MANDATORY)
	1.	Goal
	•	What is being changed and why.
	2.	Files to Touch
	•	Explicit list.
	3.	Steps
	•	Ordered, minimal.
	4.	Tests
	•	Startup, health, UI, API, backup/restore if affected.
	5.	Rollback Plan
	•	How to revert safely.

⸻

Any deviation from governance requires explicit approval and doc updates.

# OTTO Governance Covenant (Source of Truth)

This document is the single source of truth for how OTTO may be changed. Any change that violates this is rejected.

## 0) Prime Directive
- **No new folders, no new “frameworks”, no parallel systems** unless explicitly listed here.
- **Do not move files** unless the Work Order explicitly says so.
- **Never change the DB location logic** unless you update this document and governance checks.

## 1) Repo Layout (authoritative)
- `backend/` = FastAPI app source
- `frontend/` = UI app source
- `installer/` = installer packaging only
  - `installer/frontend/` = build helper + packaged static dist copy target
  - `installer/backend/` = PyInstaller build scripts + packaged backend binary output
  - `installer/electron/` = Electron launcher/proxy + electron-builder packaging

## 2) Database Single Source of Truth
- Canonical app data directory:
  - macOS: `~/Library/Application Support/OTTO`
  - Windows: `%APPDATA%\\OTTO`
  - Linux: `~/.config/OTTO`
- Canonical database path (single file):
  - `${OTTO_DATA_DIR}/db/otto.sqlite`
- **Forbidden**: any DB files committed to repo or created under `backend/` (e.g. `backend/app.db`, `backend/otto.db`).
- Backups restore must target **only** `${OTTO_DATA_DIR}/db/otto.sqlite`.

## 3) Ports & Local Networking
- No fixed ports. Always select free ports dynamically.
- Electron local control server + backend must pick ports with a deterministic “find free port” function.
- Health endpoint must be reachable:
  - Backend: `GET /health`
  - Proxy: `GET /health` forwarded to backend

## 4) Installer Rules
- Installer must package:
  - `installer/frontend/dist/**`
  - `installer/backend/dist/**` (PyInstaller output)
  - `installer/electron/main.js`
- Packaged backend binary must be executable on macOS/Linux.

## 5) Dependency Lock
- Single source of truth for Python deps: `backend/requirements.txt`
- Installer backend build **must install exactly** from `backend/requirements.txt`.
- Any import used at runtime must be in `backend/requirements.txt`.
- A preflight dependency check must fail fast if any module is missing.

## 6) Backup/Restore Governance
- Upload endpoint must be an API route, not swallowed by SPA routing.
- Restore must:
  - validate zip structure
  - write DB atomically (write temp -> fsync -> rename)
  - log every restore event (who/when/file/hash)
- On error: return JSON error with reason, never “network error”.

## 7) Change Control (mandatory)
Every ADE change must:
- Follow `docs/ADE_WORK_ORDER.md`
- Pass `python backend/governance_check.py`
- Include a short “diff map” in the PR description:
  - files changed
  - why
  - how tested

## 8) Non-negotiables
- No cloud dependency.
- Hub/Spoke must not compromise DB integrity.
- “One DB file, one canonical path” always.

---

## 2) New file: `governance/ADE_RULES.md`

```md
# ADE Rules (Non-Negotiable)

## Core rule
You may only change what is required for the assigned task, inside the declared boundaries.

## You MUST
- Follow `docs/GOVERNANCE.md`.
- Run `bash scripts/run_governance.sh` before any PR/commit is “done”.
- Keep ONE source of truth for:
  - dependencies (`backend/requirements.txt`)
  - database path rules (Hub/Spoke)
  - runtime ports / API base paths
- Add tests when fixing a bug that can regress.

## You MUST NOT
- Create new folder structures unless explicitly instructed.
- Duplicate configuration files (e.g., multiple `.env`, multiple DB locations).
- “Fix” by bypassing auth/org scoping or disabling checks.
- Introduce new build tools unless approved.

## Database safety
- Do not change DB path rules without governance approval.
- Never silently create a new DB in a different location.
- Any migration must be Alembic-backed (when applicable) and must not destroy data.

## Change discipline
- If the task is “Contracts”, you must not break Catalog/Search.
- Respect `governance/CHANGE_BOUNDARIES.yaml`.
- If you need cross-module changes, update boundaries FIRST (and explain why).

## Definition of Done (Enforced)
- All governance checks pass.
- No new unintended DB files created.
- No route regressions (frontend governance check passes).
- Minimal smoke test passes.