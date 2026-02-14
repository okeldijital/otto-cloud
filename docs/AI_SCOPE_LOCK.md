# AI Module Scope Lock

## Version: Phase 1 (Search-Only)
**Status**: LOCKED
**Date**: 2026-02-14

### 1. Functional Boundaries
Phase 1 of the AI module is strictly limited to the following capabilities:
- **Search-Only**: Queries are read-only and return existing database entries.
- **Intent Detection**: Basic parsing of user input to route to internal search tools.
- **Organization Scoping**: All queries MUST be scoped to the user's `organization_id`.
- **Audit Logging**: Mandatory logging of metadata and request hashes (SHA256).

### 2. Prohibited Capabilities (Phase 1)
The following are strictly forbidden in the current architecture:
- **No Contract Parsing**: No automated extraction of data from PDFs or raw text.
- **No Writes**: The AI module shall not create, update, or delete any Catalog, Network, or Contract entities.
- **No Analytics**: No computation of complex royalty metrics, trends, or financial forecasts.
- **No Background Jobs**: All operations must be synchronous and request-bound.
- **No External API Calls**: No communication with OpenAI, Anthropic, or other LLM providers.
- **No Module Drift**: No AI-specific logic or imports allowed inside core business modules (Catalog, Network, Contracts).

### 3. Change Management Rule
**Any new AI capability must be introduced in a new versioned phase document before implementation.** 

Implementation of "Phase 2" or beyond without a prior approved architectural review and Scope Lock update is a violation of system invariants.

### 4. Architectural Regression Gates
- AI routes must remain isolated under `/api/ai`.
- AI services must remain isolated under `services/ai/`.
- No writes allowed inside tools registered in `TOOL_REGISTRY`.
