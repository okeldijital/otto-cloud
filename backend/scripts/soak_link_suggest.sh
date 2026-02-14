#!/bin/bash

# Configuration
API_BASE="http://127.0.0.1:8001/api/ai/contracts"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
SOAK_PDFS_DIR="$REPO_ROOT/soak_pdfs_link"
OUT_DIR="$REPO_ROOT/soak_out_link"
SUMMARY_FILE="$OUT_DIR/summary.csv"

# Ensure output directory exists
mkdir -p "$OUT_DIR"

# Initialize summary CSV
echo "filename,status_extract,status_link,duration_ms" > "$SUMMARY_FILE"

echo "Starting Link Suggest Soak Test..."
echo "PDFs in $SOAK_PDFS_DIR"

# Loop over PDFs
for pdf in "$SOAK_PDFS_DIR"/*.pdf; do
    [ -e "$pdf" ] || continue
    filename=$(basename "$pdf")
    base="${filename%.*}"
    
    echo "Processing $filename..."
    start_time=$(python3 -c 'import time; print(int(time.time() * 1000))')
    
    # 1. Extract
    resp=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/extract" \
        -H "Accept: application/json" \
        -F "file=@$pdf")
    
    status=$(echo "$resp" | tail -n1)
    body=$(echo "$resp" | sed '$d')
    
    extract_status=$status
    extract_body=$body
    
    if [ "$extract_status" -ne 200 ]; then
        echo "  [ERROR] Extraction failed for $filename (Status: $extract_status)"
        echo "$filename,$extract_status,0,0" >> "$SUMMARY_FILE"
        echo "$extract_body" > "$OUT_DIR/${base}_extract_err.json"
        continue
    fi
    
    echo "$extract_body" > "$OUT_DIR/${base}_extract.json"
    
    # 2. Link Suggest
    link_payload=$(echo "$extract_body" | jq -c '{extraction: .}')
    
    resp_link=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/link_suggest" \
        -H "Content-Type: application/json" \
        -d "$link_payload")
        
    status_link=$(echo "$resp_link" | tail -n1)
    body_link=$(echo "$resp_link" | sed '$d')
    
    end_time=$(python3 -c 'import time; print(int(time.time() * 1000))')
    duration=$((end_time - start_time))
    
    if [ "$status_link" -ne 200 ]; then
        echo "  [ERROR] Linking failed for $filename (Status: $status_link)"
        echo "$body_link" > "$OUT_DIR/${base}_links_err.json"
    else
        echo "$body_link" > "$OUT_DIR/${base}_links.json"
    fi
    
    echo "$filename,$extract_status,$status_link,$duration" >> "$SUMMARY_FILE"
    echo "  [OK] Completed $filename in ${duration}ms"
done

echo "Soak test complete. Summary at $SUMMARY_FILE"
