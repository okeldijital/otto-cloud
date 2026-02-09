import hashlib
import os
import sys
from pathlib import Path


REQUIRED_REQUIREMENTS_LINES = {
    "email-validator==2.1.1",
    "pydantic[email]==2.5.3",
}


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _norm_requirements(contents: str) -> str:
    # Normalize line endings and strip trailing whitespace for stable comparisons.
    return "\n".join([line.rstrip() for line in contents.replace("\r\n", "\n").split("\n")]).strip() + "\n"


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    backend_reqs = Path(__file__).resolve().parent / "requirements.txt"

    failures: list[str] = []

    if not backend_reqs.exists():
        failures.append(f"Missing required file: {backend_reqs}")
    else:
        backend_text = _norm_requirements(_read_text(backend_reqs))
        backend_lines = {line.strip() for line in backend_text.splitlines() if line.strip() and not line.strip().startswith("#")}

        missing_lines = sorted(REQUIRED_REQUIREMENTS_LINES - backend_lines)
        if missing_lines:
            for line in missing_lines:
                failures.append(f"backend/requirements.txt missing required line: {line}")

    # Root requirements.txt is forbidden unless an explicit copy of backend/requirements.txt
    root_reqs = repo_root / "requirements.txt"
    if root_reqs.exists() and backend_reqs.exists():
        root_text = _norm_requirements(_read_text(root_reqs))
        backend_text = _norm_requirements(_read_text(backend_reqs))
        if _sha256(root_text) != _sha256(backend_text):
            failures.append(
                "Root-level requirements.txt governance violation: must be an explicit copy of backend/requirements.txt",
            )

    if failures:
        print("❌ GOVERNANCE CHECK FAILED")
        for f in failures:
            print(" -", f)
        return 1

    print("✅ Governance dependency lock check passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
