import hashlib
import json
import uuid
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from models.ai import AIAuditLog
from models.release import Release
from models.release_integration import AIReleaseIntegrationLink, AIReleaseIntegrationRun
from schemas.ai_contracts import ContractExtractionV1
from schemas.ai_release_integration import ReleaseIntegrationPlanResponse

_ALLOWED_ENTITY_TYPES = {
    "artist",
    "track",
    "work",
    "organization",
    "individual",
    "release",
    "contract",
}
_ALLOWED_ACTIONS = {"attach", "flag_missing", "ignore"}
_ALLOWED_MATCH_STRATEGIES = {"exact", "normalized", "fuzzy", "alias", "contains", "initials"}


def _canonical_request_hash(
    org_id: uuid.UUID,
    release_id: int,
    wizard_plan: ReleaseIntegrationPlanResponse,
    contract_id: Optional[int],
    contract_extract: Optional[ContractExtractionV1],
) -> str:
    payload = {
        "org_id": str(org_id),
        "release_id": release_id,
        "contract_id": contract_id,
        "wizard_plan": wizard_plan.model_dump(mode="json"),
        "contract_extract": contract_extract.model_dump(mode="json") if contract_extract else None,
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _resolve_extract(
    db: Session,
    org_id: uuid.UUID,
    contract_extract: Optional[ContractExtractionV1],
    extract_id: Optional[int],
) -> Optional[ContractExtractionV1]:
    if contract_extract is not None:
        return contract_extract

    if extract_id is None:
        return None

    extract_run = (
        db.query(AIAuditLog)
        .filter(
            AIAuditLog.id == extract_id,
            AIAuditLog.organization_id == org_id,
            AIAuditLog.action == "contract_extraction",
        )
        .first()
    )
    if not extract_run:
        raise ValueError("extract_not_found")

    # Audit rows do not store full payload; caller may still attach plan by extract reference.
    return None


def _build_link_rows(
    run: AIReleaseIntegrationRun,
    wizard_plan: ReleaseIntegrationPlanResponse,
    contract_id: Optional[int],
) -> List[AIReleaseIntegrationLink]:
    links: List[AIReleaseIntegrationLink] = []

    links.append(
        AIReleaseIntegrationLink(
            organization_id=run.organization_id,
            run_id=run.id,
            entity_type="release",
            entity_id=run.release_id,
            display_name=wizard_plan.release.title,
            action="attach",
            confidence=1.0,
            match_strategy="exact",
            rationale="Attached release integration plan to release reference.",
        )
    )

    if contract_id is not None:
        links.append(
            AIReleaseIntegrationLink(
                organization_id=run.organization_id,
                run_id=run.id,
                entity_type="contract",
                entity_id=contract_id,
                display_name=wizard_plan.contract_summary.contract_title or f"Contract {contract_id}",
                action="attach",
                confidence=1.0,
                match_strategy="exact",
                rationale="Contract reference attached from wizard payload.",
            )
        )

    for action in wizard_plan.suggested_actions:
        entity_type = action.target
        if entity_type not in _ALLOWED_ENTITY_TYPES:
            continue
        links.append(
            AIReleaseIntegrationLink(
                organization_id=run.organization_id,
                run_id=run.id,
                entity_type=entity_type,
                entity_id=int(action.candidate_id) if str(action.candidate_id).isdigit() else None,
                display_name=action.display_name,
                action="attach",
                confidence=float(action.confidence),
                match_strategy="normalized",
                rationale=action.rationale,
            )
        )

    for flag in wizard_plan.missing_flags:
        links.append(
            AIReleaseIntegrationLink(
                organization_id=run.organization_id,
                run_id=run.id,
                entity_type="release",
                entity_id=run.release_id,
                display_name=f"{flag.scope}:{flag.field}",
                action="flag_missing",
                confidence=0.0,
                match_strategy="contains",
                rationale=flag.message,
            )
        )

    return links


def attach_release_integration_plan(
    db: Session,
    org_id: uuid.UUID,
    user_id: int,
    release_id: int,
    wizard_plan: ReleaseIntegrationPlanResponse,
    contract_id: Optional[int] = None,
    contract_extract: Optional[ContractExtractionV1] = None,
    extract_id: Optional[int] = None,
    reviewed_mismatches: bool = False,
) -> Dict:
    release = (
        db.query(Release)
        .filter(Release.id == release_id, Release.organization_id == org_id)
        .first()
    )
    if not release:
        raise ValueError("release_not_found")

    if wizard_plan.release.id != release_id:
        raise ValueError("wizard_plan_release_mismatch")
    if wizard_plan.org_id != str(org_id):
        raise ValueError("wizard_plan_org_mismatch")

    _resolve_extract(
        db=db,
        org_id=org_id,
        contract_extract=contract_extract,
        extract_id=extract_id,
    )

    if wizard_plan.needs_review and not reviewed_mismatches:
        raise ValueError("review_confirmation_required")

    request_hash = _canonical_request_hash(
        org_id=org_id,
        release_id=release_id,
        wizard_plan=wizard_plan,
        contract_id=contract_id,
        contract_extract=contract_extract,
    )

    existing_run = (
        db.query(AIReleaseIntegrationRun)
        .filter(
            AIReleaseIntegrationRun.organization_id == org_id,
            AIReleaseIntegrationRun.release_id == release_id,
            AIReleaseIntegrationRun.request_hash == request_hash,
        )
        .first()
    )

    if existing_run:
        existing_count = (
            db.query(AIReleaseIntegrationLink)
            .filter(
                AIReleaseIntegrationLink.organization_id == org_id,
                AIReleaseIntegrationLink.run_id == existing_run.id,
            )
            .count()
        )
        warnings = list(wizard_plan.contract_summary.warnings)
        warnings.append("idempotent_attach_reused_existing_run")
        return {
            "run_id": existing_run.id,
            "attached_counts": {
                "runs_created": 0,
                "links_created": 0,
                "existing_links": existing_count,
            },
            "needs_review": wizard_plan.needs_review,
            "warnings": warnings,
        }

    run = AIReleaseIntegrationRun(
        organization_id=org_id,
        user_id=user_id,
        release_id=release_id,
        contract_id=contract_id,
        request_hash=request_hash,
        planner_version=wizard_plan.integration_version,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    link_rows = _build_link_rows(run=run, wizard_plan=wizard_plan, contract_id=contract_id)
    links_created = 0
    for row in link_rows:
        if row.entity_type not in _ALLOWED_ENTITY_TYPES:
            continue
        if row.action not in _ALLOWED_ACTIONS:
            continue
        if row.match_strategy not in _ALLOWED_MATCH_STRATEGIES:
            row.match_strategy = "normalized"

        exists = (
            db.query(AIReleaseIntegrationLink)
            .filter(
                AIReleaseIntegrationLink.organization_id == org_id,
                AIReleaseIntegrationLink.run_id == run.id,
                AIReleaseIntegrationLink.entity_type == row.entity_type,
                AIReleaseIntegrationLink.entity_id == row.entity_id,
                AIReleaseIntegrationLink.action == row.action,
            )
            .first()
        )
        if exists:
            continue

        db.add(row)
        links_created += 1

    db.commit()

    return {
        "run_id": run.id,
        "attached_counts": {
            "runs_created": 1,
            "links_created": links_created,
            "existing_links": 0,
        },
        "needs_review": wizard_plan.needs_review,
        "warnings": list(wizard_plan.contract_summary.warnings),
    }
