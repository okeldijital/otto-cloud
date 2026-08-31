# Contract Intelligence — Actor Mapping

Contract Intelligence crosses the new IAM identity model and legacy integer actor fields used by contract intelligence persistence.

## Rule

The authenticated IAM identity is the source of truth. Legacy actor IDs must be resolved server-side from that identity and organization scope. Client-supplied actor IDs are never accepted, and `1` is never a valid fallback.

If no unambiguous legacy actor exists for the authenticated identity, the operation fails closed with `USER_SCOPE_UNAVAILABLE`.

## Intake consequence

A successful Contract Intelligence intake must be able to move from document upload to extraction job creation. The extraction endpoint must therefore receive a valid server-resolved actor ID before invoking `documentIntelligenceService.startExtraction()`.
