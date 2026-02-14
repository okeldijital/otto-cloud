# AI Module Scope Lock - Phase 2: Contract Intelligence

## Version: Phase 2 (Contract Extraction & Resolution)
**Status**: DRAFT -> LOCKED
**Date**: 2026-02-14

### 1. Functional Boundaries
Phase 2 of the AI module introduces structured data extraction from contract documents and resolution against existing catalog/network entities.
- **Contract Extraction**: Extracting structured data from PDF contracts (dates, parties, splits).
- **Entity Resolution**: Proposing matches for extracted parties and mentioned works against the existing catalog/network.
- **Proposal-Only**: No writes or automated linking to the core database are allowed. Results are for review only.
- **Deterministic Fallback**: Must provide basic extraction even if the LLM provider is not configured.
- **Mandatory Audit**: Every extraction and resolution call must be logged in the AI audit log with file-content hashes.

### 2. Feature Flags
- `AI_ENABLED`: Master flag for the AI module.
- `AI_CONTRACT_INTEL_ENABLED`: Specific flag for Phase 2 contract intelligence features. Default: `False`.

### 3. Prohibited Capabilities (Reviewing Phase 1 + Phase 2)
The following remain strictly forbidden:
- **No Automated Writes**: No automatic creation of contracts, parties, or catalog links.
- **No Direct LLM Provider Calls**: All LLM interactions must go through the abstract `AIEngine` in `services/ai/engine.py`.
- **No Raw Text Storage**: Do not store the full text extracted from PDFs in the database.
- **No Module Drift**: Core routes (Catalog, Network, Contracts) must remain free of AI service imports.

### 4. Architectural Requirements
- **Engine Abstraction**: `services/ai/engine.py` must handle provider-agnostic communication.
- **PDF Sandbox**: Parsing must be isolated and return structured text/metadata only.
- **JSON Enforcement**: All engine outputs must be validated against Pydantic schemas.

### 5. Regression Gates
- `backend/invariant_check.py` is extended to enforce isolation of Phase 2 services.
- Static analysis prevents DB modification calls within AI extractors and matchers.
