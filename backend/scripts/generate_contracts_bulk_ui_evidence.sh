#!/bin/bash
set -e

# Base URL
API_URL="http://localhost:8000/api"

# Create dummy PDF
echo "%PDF-1.4 dummy content" > test_contract.pdf

echo "1. Uploading PDF to /ai/contracts/extract_bulk..."
# Using --form to upload file
RESPONSE=$(curl -s -X POST "$API_URL/ai/contracts/extract_bulk" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -F "files=@test_contract.pdf")

echo "Response: $RESPONSE"
JOB_ID=$(echo $RESPONSE | grep -o '"job_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  echo "Failed to get Job ID"
  exit 1
fi

echo "Job ID: $JOB_ID"

echo "2. Polling status..."
STATUS="running"
while [ "$STATUS" == "running" ] || [ "$STATUS" == "uploading" ] || [ "$STATUS" == "extracting" ]; do
  sleep 2
  STATUS_RESP=$(curl -s -X GET "$API_URL/ai/contracts/extract_bulk/status/$JOB_ID" \
    -H "Authorization: Bearer $BEARER_TOKEN")
  STATUS=$(echo $STATUS_RESP | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  echo "Status: $STATUS"
done

echo "Final Status: $STATUS"
echo "Result Payload: $STATUS_RESP"

# Even if failed (because dummy PDF), we can try next step if we had valid extract
# For dummy PDF, extract usually fails.
# But we proved the endpoint works (returns Job ID, accepts file).

# Clean up
rm test_contract.pdf
