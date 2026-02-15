from sqlalchemy.orm import Session
from models.ai import AIContractResolutionRun, AIContractResolutionLink
from schemas.ai_linking import AIResolutionRequestV1
import uuid

def persist_resolution_results(
    db: Session, 
    org_id: uuid.UUID, 
    user_id: int, 
    req: AIResolutionRequestV1
) -> int:
    """
    Persists AI resolution decisions (links/ignores) to the database.
    Governed: Only writes to ai_contract_resolution_runs/links.
    No modifications to core Catalog or Network tables.
    """
    # 1. Create Run record
    run = AIContractResolutionRun(
        organization_id=org_id,
        user_id=user_id,
        contract_hash=req.contract_hash,
        extractor_version=req.extractor_version,
        linker_version=req.linker_version
    )
    db.add(run)
    db.flush() # Get run.id

    # 2. Add individual link decisions
    for decision in req.decisions:
        link = AIContractResolutionLink(
            run_id=run.id,
            entity_type=decision.entity_type,
            entity_id=decision.entity_id,
            action=decision.action,
            confidence=decision.confidence,
            rationale=decision.rationale
        )
        db.add(link)
    
    db.commit()
    db.refresh(run)
    return run.id
