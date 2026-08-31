# Contract Intelligence

## Contract intake flow

Contract intake is an intelligence workflow, not a direct database-create form.

The intended flow is:

1. Create or open a contract intake context.
2. Upload the source contract document.
3. Start Document Intelligence extraction against the uploaded document.
4. Poll extraction status.
5. Present extracted fields for verification.
6. Resolve extracted parties/entities against the organization catalog.
7. Link the verified contract to releases/tracks as applicable.
8. Approve/finalize the contract record.

The `/api/ai/contracts?action=intake_wizard` endpoint describes this workflow, while `/api/ai/contracts?action=extract` starts the actual extraction job. The Document Intelligence service performs OCR/text extraction, AI field extraction, persistence, and verification-pending activity emission.

## Actor identity boundary

Contract tables retain legacy integer actor fields while OTTO IAM uses the authenticated identity UUID. Contract Intelligence must resolve the authenticated IAM identity to its organization-scoped legacy actor ID before creating extraction jobs or writing legacy audit/activity records.

`requireActorUserId()` is intentionally fail-closed and must not invent a fallback actor such as user `1`. If the authenticated identity cannot be mapped to a legacy actor, intake must return an explicit actor-scope error rather than silently creating an incorrectly attributed extraction.

## Current integration requirement

The UI must not treat **Add Contract** as equivalent to contract intelligence intake. Adding a database record is a separate manual-entry path. The Contract Intelligence entry point must upload a document and invoke the extraction endpoint, then display extraction status/results and verification controls.

## Acceptance criteria

- Authenticated users with valid organization membership can start extraction.
- The extraction job records the authenticated actor through a server-side IAM-to-legacy mapping.
- No client-supplied actor ID is trusted.
- No fabricated/default actor ID is used.
- Extraction errors are surfaced to the wizard rather than leaving the user on a misleading review state.
- After extraction completes, the wizard can retrieve the extraction result and enter verification.
