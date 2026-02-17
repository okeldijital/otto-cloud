import json
from typing import Dict, List

from sqlalchemy.orm import Session

from models.artist import Artist
from models.contract import Contract, ContractParty
from models.contract_wizard import AIContractDraft
from models.release import Release


def _norm(value: str) -> str:
    return " ".join((value or "").lower().split())


def _load_contract_extraction(db: Session, org_id, contract: Contract) -> Dict:
    doc_checksums = [doc.checksum for doc in (contract.documents or []) if getattr(doc, "checksum", None)]
    if doc_checksums:
        draft = (
            db.query(AIContractDraft)
            .filter(
                AIContractDraft.organization_id == org_id,
                AIContractDraft.file_hash.in_(doc_checksums),
            )
            .order_by(AIContractDraft.created_at.desc())
            .first()
        )
        if draft:
            return json.loads(draft.extraction_json)

    return {
        "contract_title": contract.title,
        "territory": contract.territory,
        "parties": [{"display_name": p.external_name or "", "confidence": 0.5} for p in contract.parties or []],
        "splits": [],
        "splits_total": 0.0,
        "warnings": ["no_extraction_found_for_contract_documents"],
    }


def build_contract_attach_plan(db: Session, *, org_id, contract_id: int, release_id: int) -> Dict:
    contract = (
        db.query(Contract)
        .filter(Contract.id == contract_id, Contract.organization_id == org_id)
        .first()
    )
    if not contract:
        raise ValueError("contract_not_found")

    release = (
        db.query(Release)
        .filter(Release.id == release_id, Release.organization_id == org_id)
        .first()
    )
    if not release:
        raise ValueError("release_not_found")

    extraction = _load_contract_extraction(db, org_id, contract)
    release_artist = (
        db.query(Artist)
        .filter(Artist.id == release.artist_id, Artist.organization_id == org_id)
        .first()
        if release.artist_id
        else None
    )

    party_names = [p.get("display_name") for p in extraction.get("parties", []) if p.get("display_name")]
    release_party_candidates = [release_artist.name] if release_artist else []
    core_contract_parties = [p.external_name for p in (contract.parties or []) if p.external_name]
    release_party_candidates.extend(core_contract_parties)

    matches: List[Dict] = []
    unmatched: List[Dict] = []
    for party in party_names:
        norm_party = _norm(party)
        best = None
        for candidate in release_party_candidates:
            if _norm(candidate) == norm_party:
                best = candidate
                break
        if best:
            matches.append({"contract": party, "core": best, "confidence": 0.92})
        else:
            unmatched.append({"contract": party, "confidence": 0.85})

    missing_flags = []
    if release_artist is None and party_names:
        missing_flags.append(
            {
                "code": "release_missing_primary_artist",
                "message": "Release has no primary artist while contract references parties.",
            }
        )
    if unmatched:
        missing_flags.append(
            {
                "code": "contract_party_unresolved",
                "message": f"{len(unmatched)} contract parties could not be resolved in current release context.",
            }
        )

    contract_territory = extraction.get("territory")
    release_territory = getattr(release, "territory", None)
    diff = {
        "territory": {
            "current": release_territory,
            "contract": contract_territory,
            "action": "review" if contract_territory and release_territory and contract_territory != release_territory else "none",
        },
        "parties": {
            "matches": matches,
            "unmatched": unmatched,
        },
        "splits": {
            "total_percent": extraction.get("splits_total", 0.0),
            "issues": extraction.get("warnings", []),
        },
    }

    recommendations = [
        {
            "type": "link_party",
            "target": row["contract"],
            "confidence": row.get("confidence", 0.7),
        }
        for row in unmatched
    ]

    return {
        "status": "plan_ready",
        "contract_id": contract.id,
        "release_id": release.id,
        "missing_flags": missing_flags,
        "diff": diff,
        "recommendations": recommendations,
        "needs_review": bool(missing_flags or unmatched),
    }
