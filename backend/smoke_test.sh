#!/bin/bash
set -e
cd "$(dirname "$0")"

BIN="dist/otto-backend"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  BIN="dist/otto-backend.exe"
fi

python3 smoke_test.py "$BIN"
