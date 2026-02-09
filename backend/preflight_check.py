import sys

REQUIRED_MODULES = [
    "fastapi",
    "uvicorn",
    "sqlalchemy",
    "pydantic",
    "email_validator",
]


def main():
    failures = []
    for m in REQUIRED_MODULES:
        try:
            __import__(m)
        except Exception as e:
            failures.append(f"{m}: {e}")

    if failures:
        print("❌ PRE-FLIGHT FAILED: Missing runtime dependencies")
        for f in failures:
            print(" -", f)
        sys.exit(1)

    print("✅ Pre-flight dependency check passed")


if __name__ == "__main__":
    main()
