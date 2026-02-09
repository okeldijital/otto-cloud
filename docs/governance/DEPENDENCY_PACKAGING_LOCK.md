# Dependency Packaging Lock (Otto V1.0.1)

Status: **LOCKED**

This document defines the non-negotiable governance rules for backend dependency declaration and packaging. Any violation is a release blocker.

## Single Source of Truth

- All backend runtime dependencies **must** be declared in `backend/requirements.txt`.
- No dependency may be imported at runtime unless declared there.
- Root-level `requirements.txt` is **forbidden** unless it is an explicit copy of `backend/requirements.txt`.

Enforcement:
- `backend/governance_check.py` fails the build if:
  - `backend/requirements.txt` is missing required locked lines (including `email-validator==2.1.1`)
  - Root `requirements.txt` exists and is not an exact copy of `backend/requirements.txt`

## Pre-Flight Dependency Check (Build Gate)

- `backend/preflight_check.py` imports critical runtime modules:
  - `fastapi`
  - `uvicorn`
  - `sqlalchemy`
  - `pydantic`
  - `email_validator`
- Any import failure must:
  - print missing modules clearly
  - exit with code `1`

Build policy:
- Local builds and CI must run `backend/preflight_check.py` **before** PyInstaller.
- If pre-flight fails → build must abort.

## PyInstaller Packaging Lock

PyInstaller builds must explicitly include dynamic imports:
- `email_validator`
- `pydantic.networks`
- `uvicorn.*`

Enforcement:
- `backend/build_backend.sh` includes explicit `--hidden-import` and `--collect-all uvicorn` flags.
- Spec files used by other build paths must include the same hidden-import coverage.

Any packaging that omits these is a governance violation.

## Runtime Smoke Test (Hard Gate)

After building the backend binary:
- Start the binary.
- Assert `GET /health` responds successfully.
- If `/health` fails → fail the build.

Enforcement:
- `backend/smoke_test.py` is executed by `backend/build_backend.sh` after PyInstaller output is produced.

## Logging + Observability

Backend startup errors must be observable:
- stdout/stderr (Electron captures these)
- persistent log file:
  - macOS: `~/Library/Application Support/OTTO/logs/backend.log`
  - Windows: `%AppData%/OTTO/logs/backend.log`
  - Linux: `~/.local/share/OTTO/logs/backend.log`

Electron must surface backend failure explicitly (no silent white screen).

## Email Validation Lock

Because Otto uses `pydantic.EmailStr`, this is required and pinned:
- `email-validator==2.1.1`

## Change Control

Any PR that changes backend imports must:
- update `backend/requirements.txt`
- pass `backend/preflight_check.py`
- pass `backend/smoke_test.py`
- add a one-line note to `CHANGELOG.md`

## Failure Classification (Locked)

Any of the following runtime errors:
- `ModuleNotFoundError: sqlalchemy`
- `ImportError: email-validator is not installed`

⇒ **Packaging Governance Breach**

No release is allowed until:
- requirements are corrected,
- pre-flight passes,
- PyInstaller hidden-import lock is satisfied,
- smoke test passes.

