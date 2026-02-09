#!/bin/bash
set -e

cd "$(dirname "$0")"

BIN="./dist/otto_backend/otto_backend"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  BIN="./dist/otto_backend/otto_backend.exe"
fi

python3 - <<'PY'
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request

bin_path = os.environ.get("OTTO_BACKEND_BIN")
if not bin_path:
    # Default relative path from installer/backend
    bin_path = os.path.join(os.path.dirname(__file__), "dist", "otto_backend", "otto_backend")
    if os.name == "nt":
        bin_path += ".exe"

def pick_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]

port = pick_port()
health = f"http://127.0.0.1:{port}/health"

env = dict(os.environ)
env["OTTO_SMOKE"] = "1"
env["PORT"] = str(port)

proc = subprocess.Popen(
    [bin_path, "--smoke"],
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
            print("❌ Smoke test failed: backend exited early", file=sys.stderr)
            if out.strip():
                print("---- stdout ----", file=sys.stderr)
                print(out.strip(), file=sys.stderr)
            if err.strip():
                print("---- stderr ----", file=sys.stderr)
                print(err.strip(), file=sys.stderr)
            sys.exit(1)
        try:
            with urllib.request.urlopen(health, timeout=1.5) as resp:
                if resp.status == 200:
                    print(f"✅ Smoke test passed: {health}")
                    sys.exit(0)
        except Exception:
            time.sleep(1)

    out, err = proc.communicate(timeout=2)
    print(f"❌ Smoke test failed: /health not ready within 30s ({health})", file=sys.stderr)
    if out.strip():
        print("---- stdout ----", file=sys.stderr)
        print(out.strip(), file=sys.stderr)
    if err.strip():
        print("---- stderr ----", file=sys.stderr)
        print(err.strip(), file=sys.stderr)
    sys.exit(1)
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
PY
