#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "macOS packaged smoke test (Electron + backend)"
echo "============================================="

APP_DIR="dist/mac-arm64/OTTO.app"
if [[ ! -d "$APP_DIR" ]]; then
  # Fallback: find any OTTO.app under dist/
  APP_DIR="$(find dist -maxdepth 3 -name 'OTTO.app' -type d | head -n 1 || true)"
fi

if [[ -z "${APP_DIR:-}" || ! -d "$APP_DIR" ]]; then
  echo "❌ OTTO.app not found under installer/electron/dist"
  exit 1
fi

BACKEND_BIN="$APP_DIR/Contents/Resources/backend/otto_backend/otto_backend"

echo "App: $APP_DIR"
echo "Backend: $BACKEND_BIN"

test -e "$BACKEND_BIN"
test -x "$BACKEND_BIN"

echo "--- file ---"
file "$BACKEND_BIN" | tee /dev/stderr | grep -E "Mach-O" >/dev/null

echo "--- xattr (best-effort) ---"
xattr -l "$BACKEND_BIN" || true

echo "--- quick run (--help) ---"
set +e
"$BACKEND_BIN" --help >/dev/null 2>&1
HELP_RC=$?
set -e
if [[ "$HELP_RC" -ne 0 ]]; then
  echo "❌ --help returned non-zero ($HELP_RC)"
  exit 1
fi

echo "--- start + /health ---"
PORT="$(python3 - <<'PY'
import socket
s=socket.socket()
s.bind(("127.0.0.1",0))
print(s.getsockname()[1])
s.close()
PY
)"

OTTO_SMOKE=1 PORT="$PORT" "$BACKEND_BIN" --smoke >/tmp/otto_backend_smoke.out 2>/tmp/otto_backend_smoke.err &
PID=$!

cleanup() {
  kill "$PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

deadline=$(( $(date +%s) + 30 ))
ok=0
while [[ $(date +%s) -lt $deadline ]]; do
  if curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 1
done

if [[ "$ok" -ne 1 ]]; then
  echo "❌ /health not ready within 30s on port $PORT"
  echo "---- stdout ----"
  tail -n 50 /tmp/otto_backend_smoke.out || true
  echo "---- stderr ----"
  tail -n 50 /tmp/otto_backend_smoke.err || true
  exit 1
fi

echo "✅ Packaged smoke test passed"

