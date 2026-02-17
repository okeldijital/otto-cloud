from pathlib import Path
import os


def test_hub_smoke_scripts_exist_and_executable():
    root = Path(__file__).resolve().parents[2]
    scripts = [
        root / "backend/scripts/e2e_org_isolation_smoke.sh",
        root / "backend/scripts/generate_hub_smoke_core_write_evidence.sh",
    ]
    for script in scripts:
        assert script.exists(), f"Missing script: {script}"
        assert os.access(script, os.X_OK), f"Script is not executable: {script}"
