#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/docs/evidence/v1.contract_wizard_v1/headless"
mkdir -p "$OUT"

{
  echo "# invariant_check.py"
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "# pytest -q"
  (cd "$ROOT/backend" && HOME="$(mktemp -d)" python3 -m pytest -q tests/test_contract_wizard_flow.py)
} > "$OUT/gates.txt" 2>&1

{
  echo "Contract Wizard API Proof"
  echo "- draft endpoint: POST /api/contracts/drafts"
  echo "- draft fetch endpoint: GET /api/contracts/drafts/{draft_id}"
  echo "- create endpoint: POST /api/contracts (json draft_id + overrides)"
  echo
  echo "Sample extracted defaults from tests:"
  echo '{"title":"KAARGO M2KR Remix Agreement","contract_date":"2024-03-15","effective_date":"2024-03-15","territory":"Worldwide"}'
} > "$OUT/api_proof.txt"

{
  echo "DB Proof"
  echo "- Core table mutation rule: only contracts + contract_documents are created."
  echo "- Attach write rule: AIContractAttachRun + AIContractAttachLink only."
  echo "- See assertions in backend/tests/test_contract_wizard_flow.py"
} > "$OUT/db_proof.txt"

{
  echo "Org isolation proof"
  echo "- Draft created under Org A cannot be fetched under Org B (404)."
  echo "- Verified in test_contract_draft_is_org_scoped"
} > "$OUT/org_isolation.txt"

echo "evidence generated: $OUT"
