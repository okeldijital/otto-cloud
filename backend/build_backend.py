#!/usr/bin/env python3
"""PyInstaller spec generator for Otto backend."""

from pathlib import Path


def main() -> None:
    backend_dir = Path(__file__).parent
    spec_path = backend_dir / "otto-backend.spec"
    if spec_path.exists():
        print(f"✅ Using maintained spec file: {spec_path}")
    else:
        raise SystemExit(f"❌ Missing required spec file: {spec_path}")


if __name__ == "__main__":
    main()
