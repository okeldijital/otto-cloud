# AI Provider Architecture — Document Intelligence

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **Package** | `lib/document-intelligence` + `lib/ai-provider` |

---

## Abstraction

```
DocumentIntelligenceService
        ↓
ExtractionProvider (interface)
        ↓
┌───────────────────┬────────────────────────┐
│ AiExtractionAdapter│ DeterministicExtraction│
│ (openai/anthropic) │ (rules / regex)        │
└─────────┬─────────┴────────────────────────┘
          ↓
   lib/ai-provider.complete()
```

Business logic never imports vendor SDKs directly for extraction.

---

## Prompt versioning

- `EXTRACTION_PROMPT_VERSION` (`contract-extract-v1`) stored on every `DocumentExtraction`.
- Raw model response persisted in `rawResponse`.
- Normalized field set in `normalizedResponse` + `ExtractionField` rows.

---

## Confidence

- Per-field `confidence` ∈ [0, 1]
- `overallConfidence` = mean of fields (OCR-adjusted when scans)
- `verificationState` defaults to `draft` — never auto-accepted

---

## Swapping providers

1. Implement `ExtractionProvider`.
2. Inject into `DocumentIntelligenceService` constructor.
3. No schema change required.

---

## Failure modes

| Condition | Behavior |
|-----------|----------|
| AI timeout / unavailable | Retry job (up to maxAttempts) |
| JSON parse failure | Fall back to deterministic extraction |
| AI_PROVIDER=deterministic | Rules-only path |
