#!/bin/bash
# Re-obtain Token
TOKEN=$(curl -s -X POST "http://127.0.0.1:8001/api/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "username=admin@otto.com&password=admin" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Run Extract
curl -s -X POST "http://127.0.0.1:8001/api/ai/contracts/extract" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./KAARGO M2KR Remix Agreement.pdf" | python3 -m json.tool

# Run Resolve (Empty)
curl -s -X POST "http://127.0.0.1:8001/api/ai/contracts/resolve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool
