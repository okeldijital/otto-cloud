# ADR-011 — Document Intelligence Layer

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Milestone** | Contract Center 3.0 — Document Intelligence Foundation |

---

## Decision

Document intelligence is a **separate layer** that consumes the Document Platform and PDF Viewer without modifying them.

Pipeline:

```
PDF (legal source)
  → OCR if required
  → Text
  → AI extraction
  → Draft fields + confidence
  → Human verification (mandatory)
  → (future) Verified contract data
```

**Nothing becomes verified automatically.** All AI output is draft and editable by humans in later milestones.

---

## Reason

- Preserves immutability of stored PDFs (ADR-008).
- Prevents intelligence coupling from contaminating storage or viewing.
- Enables swappable OCR and AI providers.
- Makes the human review boundary explicit in data model (`verificationState`, `isVerified: false`).

---

## Alternatives considered

### A. Embed extraction fields on `document_assets`

Rejected — mixes storage metadata with interpretation; violates platform purity.

### B. Auto-apply AI fields to contracts

Rejected — legal risk; human verification is mandatory.

### C. Synchronous request-bound extraction only

Rejected for large PDFs; async jobs with status are required.

---

## Consequences

| Area | Implication |
|------|-------------|
| Schema | `DocumentExtractionJob`, `DocumentExtraction`, `ExtractionField`, `VerificationDraft` |
| Package | `lib/document-intelligence` |
| Providers | `OcrProvider`, `ExtractionProvider` abstractions |
| UI | Status badges, intelligence workspace shell |
| Future | Editing/approval APIs, clause library, risk scoring stay out of 3.0 |

---

## Non-goals (3.0)

Clause library, risk scoring, semantic search, auto-approval, AI chat, release integration, legal advice.
