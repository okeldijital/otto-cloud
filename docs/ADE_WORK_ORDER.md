# ADE Work Order (Mandatory)

## Objective (1 sentence)

## Constraints
- Do not change DB location logic
- No new folders unless explicitly approved
- No fixed ports
- Dependencies must be in backend/requirements.txt

## Allowed files to change (explicit list)

## Implementation steps (max 7 bullets)

## Acceptance checks
- python backend/governance_gate.py => PASS
- Backend: GET /health returns 200
- UI loads without Backend Connection Lost
- If backup/restore touched: upload+restore works end-to-end

## Deliverables
- patch
- test evidence
- rollback steps
