# ADE Work Order (Mandatory Template)

## A) Objective (1 sentence)
What exactly are you changing and why?

## B) Constraints (must restate)
- No new folders unless approved
- Do not move DB location
- No fixed ports
- backend deps from backend/requirements.txt only

## C) Files Allowed to Change (explicit list)
(Write the exact file paths here. Any other file touched = reject.)

## D) Implementation Plan (max 7 bullets)
Short, deterministic steps.

## E) Acceptance Checks (must include commands + expected output)
Minimum:
- `python backend/governance_check.py` => PASS
- Backend boots: `/health` returns 200
- UI loads without “Backend Connection Lost”
- If backup/restore touched: upload+restore works end-to-end

## F) Deliverables
- Patch
- Notes: what changed, how tested
- Rollback steps

## G) No-Surprises Rule
If anything unexpected appears (new errors, missing files, new deps), STOP and report before continuing.