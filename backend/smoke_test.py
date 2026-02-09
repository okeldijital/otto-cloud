import os
import signal
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path


def _health_ok(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=1.5) as resp:
            return resp.status == 200
    except (urllib.error.URLError, TimeoutError, ValueError):
        return False


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: smoke_test.py <path-to-backend-binary> [port]")
        return 2

    binary = Path(sys.argv[1]).resolve()
    if not binary.exists():
        print(f"❌ Smoke test failed: binary not found: {binary}")
        return 1

    port = int(sys.argv[2]) if len(sys.argv) >= 3 else 8010
    health_url = f"http://127.0.0.1:{port}/health"

    with tempfile.TemporaryDirectory(prefix="otto-smoke-") as tmp:
        tmp_path = Path(tmp)
        db_path = tmp_path / "otto.db"
        app_data = tmp_path / "appdata"
        storage_root = app_data / "storage"
        import_logs_root = app_data / "import_logs"
        logs_root = app_data / "logs"
        storage_root.mkdir(parents=True, exist_ok=True)
        import_logs_root.mkdir(parents=True, exist_ok=True)
        logs_root.mkdir(parents=True, exist_ok=True)

        env = {
            **os.environ,
            "APP_ENV": "desktop",
            "PORT": str(port),
            "DATABASE_URL": f"sqlite:///{db_path}",
            "STORAGE_ROOT": str(storage_root),
            "IMPORT_LOGS_ROOT": str(import_logs_root),
            "APP_DATA_DIR": str(app_data),
        }

        proc = subprocess.Popen(
            [str(binary)],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        try:
            deadline = time.time() + 30
            while time.time() < deadline:
                if proc.poll() is not None:
                    out, err = proc.communicate(timeout=2)
                    print("❌ Smoke test failed: backend exited before becoming healthy")
                    if out.strip():
                        print("---- stdout ----")
                        print(out.strip())
                    if err.strip():
                        print("---- stderr ----")
                        print(err.strip())
                    return 1

                if _health_ok(health_url):
                    print(f"✅ Smoke test passed: {health_url} responded")
                    return 0

                time.sleep(1)

            out, err = proc.communicate(timeout=2)
            print(f"❌ Smoke test failed: /health did not become ready: {health_url}")
            if out.strip():
                print("---- stdout ----")
                print(out.strip())
            if err.strip():
                print("---- stderr ----")
                print(err.strip())
            return 1
        finally:
            if proc.poll() is None:
                try:
                    if os.name == "nt":
                        proc.terminate()
                    else:
                        proc.send_signal(signal.SIGTERM)
                    proc.wait(timeout=5)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass


if __name__ == "__main__":
    raise SystemExit(main())
