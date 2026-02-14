# AI Module Runbook

## AI Contracts Extraction

### Prerequisites
- AI Enabled in config (`AI_ENABLED=True`, `AI_CONTRACT_INTEL_ENABLED=True`)
- Valid Auth Token

### Extraction Command

```bash
TOKEN="<paste_access_token_here>"
curl -X POST "http://127.0.0.1:8001/api/ai/contracts/extract" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./KAARGO M2KR Remix Agreement.pdf"
```

## Gating Verification
- If AI is disabled, the endpoint returns 404.
- If AI is enabled, the endpoint returns 200 (success) or 400 (if file invalid).
