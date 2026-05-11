#!/bin/bash
# backend/scripts/generate_backup_storage_fix_evidence.sh
# Headless evidence generator for backup storage fix.

set -e

EVIDENCE_DIR="docs/evidence/v1.backup_storage_fix/headless"
mkdir -p "$EVIDENCE_DIR"

echo "--- GATES: Invariant + Pytest ---" > "$EVIDENCE_DIR/gates.txt"
python backend/invariant_check.py >> "$EVIDENCE_DIR/gates.txt" 2>&1 || echo "Invariant Check Failed" >> "$EVIDENCE_DIR/gates.txt"
pytest backend/tests/test_backup_root_safety.py backend/tests/test_backup_retention.py backend/tests/test_scc_storage_usage.py >> "$EVIDENCE_DIR/gates.txt" 2>&1

echo "--- API PROOF: Storage Usage + Safe Backup ---" > "$EVIDENCE_DIR/api_proof.txt"
echo "GET /api/admin/scc/storage/usage:" >> "$EVIDENCE_DIR/api_proof.txt"
curl -s http://localhost:8001/api/admin/scc/storage/usage | jq . >> "$EVIDENCE_DIR/api_proof.txt"

echo -e "\nPOST /api/admin/backups (Manual Run):" >> "$EVIDENCE_DIR/api_proof.txt"
curl -s -X POST http://localhost:8001/api/admin/backups | jq . >> "$EVIDENCE_DIR/api_proof.txt"

echo "--- SAFETY PROOF: 422 on Unsafe Root ---" > "$EVIDENCE_DIR/safety_proof.txt"
echo "Attempting backup with BACKUP_ROOT forced to STORAGE_ROOT/backups..." >> "$EVIDENCE_DIR/safety_proof.txt"
# We'll use a temp env var to override config if the app was running with it, 
# but for headless proof we can just show the test output or a manual curl if we can force the config.
# Since we have the test results in gates.txt, we can also just cat the specific test output here.
pytest backend/tests/test_backup_root_safety.py -k test_backup_root_safety_storage_root >> "$EVIDENCE_DIR/safety_proof.txt" 2>&1

echo "--- DU PROOF: Cleanup + Safe Recreation ---" > "$EVIDENCE_DIR/du_proof.txt"
STORAGE_ROOT=$(python -c "from config import settings; print(settings.STORAGE_ROOT)")
BACKUP_ROOT=$(python -c "from config import settings; print(settings.BACKUP_ROOT)")

echo "Before Cleanup - STORAGE_ROOT size:" >> "$EVIDENCE_DIR/du_proof.txt"
du -sh "$STORAGE_ROOT" >> "$EVIDENCE_DIR/du_proof.txt"

echo "Running Cleanup Script..." >> "$EVIDENCE_DIR/du_proof.txt"
CONFIRM_DELETE=true bash backend/scripts/cleanup_recursive_backups.sh >> "$EVIDENCE_DIR/du_proof.txt" 2>&1

echo -e "\nAfter Cleanup - STORAGE_ROOT size:" >> "$EVIDENCE_DIR/du_proof.txt"
du -sh "$STORAGE_ROOT" >> "$EVIDENCE_DIR/du_proof.txt"

echo -e "\nPost-Fix Backup - BACKUP_ROOT size:" >> "$EVIDENCE_DIR/du_proof.txt"
# Trigger one more backup to show it goes to BACKUP_ROOT
curl -s -X POST http://localhost:8001/api/admin/backups > /dev/null
du -sh "$BACKUP_ROOT" >> "$EVIDENCE_DIR/du_proof.txt"

echo "Evidence Generation Complete."
