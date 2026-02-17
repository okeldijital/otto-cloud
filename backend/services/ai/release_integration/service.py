import uuid

from sqlalchemy.orm import Session

from models.ai import AIContractResolutionRun
from models.contract_intake_links import ContractIntakeReleaseLink
from models.release import Release


def attach_resolution_run_to_release(
    db: Session,
    org_id: uuid.UUID,
    user_id: int,
    run_id: int,
    release_id: int,
) -> ContractIntakeReleaseLink:
    """
    Create an additive linkage between a resolution run and a release.
    Governance: no core-table mutations, org-scoped reads/writes only.
    """
    run = (
        db.query(AIContractResolutionRun)
        .filter(
            AIContractResolutionRun.id == run_id,
            AIContractResolutionRun.organization_id == org_id,
        )
        .first()
    )
    if not run:
        raise ValueError("resolution_run_not_found")

    release = (
        db.query(Release)
        .filter(Release.id == release_id, Release.organization_id == org_id)
        .first()
    )
    if not release:
        raise ValueError("release_not_found")

    existing_link = (
        db.query(ContractIntakeReleaseLink)
        .filter(
            ContractIntakeReleaseLink.organization_id == org_id,
            ContractIntakeReleaseLink.resolution_run_id == run_id,
            ContractIntakeReleaseLink.release_id == release_id,
        )
        .first()
    )
    if existing_link:
        return existing_link

    link = ContractIntakeReleaseLink(
        organization_id=org_id,
        resolution_run_id=run_id,
        release_id=release_id,
        linked_by_user_id=user_id,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link
