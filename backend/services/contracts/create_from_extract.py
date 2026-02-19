import hashlib
import json
import os
import random
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

from sqlalchemy.orm import Session

from config import settings
from models.contract import Contract, ContractDocument, ContractAsset, ContractParty
from models.contract_track_links import ContractTrackLink
from models.track import Track
from services.ai.extractors.contract_extractor_v1 import deterministic_extract
from services.ai.parsing.pdf_extract import extract_text_from_pdf
from services.contracts.save_parties import save_parties

_ALLOWED_TYPES = {"recording", "publishing", "license", "other", "unknown", "remix", "master"}
_ALLOWED_STATUS = {"draft", "active", "expired", "archived"}


def _next_contract_number(db: Session, org_id) -> str:
    for _ in range(20):
        candidate = f"CTR-{random.randint(100000, 999999)}"
        exists = (
            db.query(Contract)
            .filter(Contract.organization_id == org_id, Contract.contract_number == candidate)
            .first()
        )
        if not exists:
            return candidate
    return f"CTR-{int(datetime.utcnow().timestamp())}"


def _parse_date(date_str):
    if date_str in (None, "", "null"):
        return None
    if isinstance(date_str, str):
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    return date_str


def _safe_title_from_filename(filename: str) -> str:
    base = os.path.splitext(os.path.basename(filename))[0]
    return (base or "Untitled Contract").strip()


def _extract_meta_from_notes(notes: str | None) -> dict:
    marker = "\n[OTTO_META]"
    raw = notes or ""
    if marker not in raw:
        return {}
    try:
        return json.loads(raw.rsplit(marker, 1)[1].strip() or "{}")
    except Exception:
        return {}


def _append_meta(notes: str | None, meta: dict) -> str:
    marker = "\n[OTTO_META]"
    raw = notes or ""
    if marker in raw:
        raw = raw.rsplit(marker, 1)[0]
    return f"{raw.rstrip()}{marker}{json.dumps(meta, sort_keys=True)}"


def _payload_hash_for_idempotency(payload: dict) -> str:
    raw_track_ids = payload.get("track_ids") or []
    norm_track_ids = []
    for item in raw_track_ids:
        try:
            norm_track_ids.append(int(item))
        except Exception:
            continue
    normalized = {
        "confirm_non_destructive": payload.get("confirm_non_destructive"),
        "extract_version": payload.get("extract_version"),
        "extract": payload.get("extract") or {},
        "track_ids": sorted(list(set(norm_track_ids))),
        "create_parties": bool(payload.get("create_parties", False)),
        "party_links": payload.get("party_links") or [],
        "title": payload.get("title"),
        "type": payload.get("type"),
        "status": payload.get("status"),
        "start_date": payload.get("start_date"),
        "end_date": payload.get("end_date"),
        "user_overrides": payload.get("user_overrides") or {},
    }
    blob = json.dumps(normalized, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(blob.encode()).hexdigest()


def _iso_or_none(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _build_completeness(*, documents: int, tracks: int, parties: int, effective_date: bool, end_date_known: bool, territory: bool, term_present: bool):
    reasons = []
    score = 0
    if tracks > 0:
        score += 40
    else:
        reasons.append({"code": "missing_tracks", "message": "No linked tracks", "weight": 40})
    if parties > 0:
        score += 40
    else:
        reasons.append({"code": "missing_parties", "message": "No parties linked", "weight": 40})
    if documents > 0:
        score += 20
    else:
        reasons.append({"code": "missing_documents", "message": "No attached document", "weight": 20})

    # Keep non-scoring metadata warnings for UI diagnostics.
    if not territory:
        reasons.append({"code": "missing_territory", "message": "Territory not set", "weight": 10})
    if not effective_date:
        reasons.append({"code": "missing_effective_date", "message": "Effective date not set", "weight": 5})
    if not term_present:
        reasons.append({"code": "missing_term", "message": "Term not set", "weight": 5})

    score = max(0, min(100, score))
    missing = [r["code"] for r in reasons]
    if ("missing_tracks" in missing) or ("missing_parties" in missing) or score < 60:
        status_quo = "red"
    elif score == 100:
        status_quo = "green"
    else:
        status_quo = "amber"

    notes = []
    if "missing_parties" in missing:
        notes.append("no_parties_linked")
    if "missing_tracks" in missing:
        notes.append("no_tracks_linked")
    if "missing_documents" in missing:
        notes.append("no_documents_attached")
    return {
        "version": "v1",
        "score": score,
        "status_quo": status_quo,
        "color": status_quo,
        "missing": missing,
        "notes": notes,
        "reasons": reasons,
        "signals": {
            "documents": documents,
            "tracks": tracks,
            "parties": parties,
            "effective_date": effective_date,
            "end_date_known": end_date_known,
            "territory": territory,
            "term_present": term_present,
        },
    }


def _normalize_party_links(raw_links) -> list[dict]:
    normalized = []
    if not isinstance(raw_links, list):
        return normalized
    for row in raw_links:
        if not isinstance(row, dict):
            continue
        entity_type = str(row.get("entity_type") or "").strip().lower()
        role = str(row.get("role") or "other").strip().lower()
        split_percent = row.get("split_percent")
        notes = row.get("notes")
        external_name = str(row.get("external_name") or "").strip()
        entity_id = row.get("entity_id")
        if entity_type in {"artist", "organization", "individual"}:
            try:
                entity_id = int(entity_id)
            except Exception:
                continue
            normalized.append(
                {
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "external_name": None,
                    "role": role,
                    "split_percent": split_percent,
                    "notes": notes,
                }
            )
            continue
        if entity_type == "external" and external_name:
            normalized.append(
                {
                    "entity_type": "external",
                    "entity_id": None,
                    "external_name": external_name,
                    "role": role,
                    "split_percent": split_percent,
                    "notes": notes,
                }
            )
    return normalized


def create_contract_from_extract(
    db: Session,
    *,
    org_id,
    user_id: int,
    file_name: str,
    file_content: bytes,
    payload: dict,
) -> dict:
    if not file_name.lower().endswith(".pdf") or not file_content:
        raise ValueError("invalid_file")

    if payload.get("confirm_non_destructive") is not True:
        raise ValueError("confirmation_required")

    payload_extract = payload.get("extract") if isinstance(payload.get("extract"), dict) else {}
    contract_type = str(
        payload.get("type")
        or payload.get("contract_type")
        or payload_extract.get("type")
        or "other"
    ).strip().lower()
    status = str(payload.get("status") or "draft").strip().lower()
    type_alias = {"remix": "recording", "master": "recording"}
    contract_type = type_alias.get(contract_type, contract_type)
    if contract_type not in _ALLOWED_TYPES:
        raise ValueError("invalid_contract_type")
    if status not in _ALLOWED_STATUS:
        raise ValueError("invalid_status")

    parsed = extract_text_from_pdf(file_content)
    extraction = deterministic_extract(parsed["text"])
    extraction_payload = extraction.model_dump(mode="json")
    extraction_payload["contract_date"] = extraction_payload.get("effective_date")
    extraction_payload["expiration_date"] = extraction_payload.get("end_date")

    provided_extract = payload.get("extract") if isinstance(payload.get("extract"), dict) else {}
    extract_dates = provided_extract.get("dates") if isinstance(provided_extract.get("dates"), dict) else {}
    extract_terms = provided_extract.get("key_terms") if isinstance(provided_extract.get("key_terms"), dict) else {}

    overrides = payload.get("user_overrides") or {}
    if not isinstance(overrides, dict):
        overrides = {}

    extracted_title = extraction.contract_title
    if extracted_title and extracted_title == "Governed Extraction (Deterministic V1)":
        extracted_title = None

    idempotency_key = (payload.get("idempotency_key") or "").strip() or f"sha256:{parsed['sha256']}"
    payload_hash = _payload_hash_for_idempotency(payload)

    for existing in db.query(Contract).filter(Contract.organization_id == org_id).all():
        meta = _extract_meta_from_notes(existing.notes)
        if meta.get("idempotency_key") != idempotency_key:
            continue
        if meta.get("payload_hash") != payload_hash:
            raise ValueError("idempotency_conflict")
        docs = db.query(ContractDocument).filter(ContractDocument.organization_id == org_id, ContractDocument.contract_id == existing.id).count()
        tracks = db.query(ContractTrackLink).filter(ContractTrackLink.organization_id == org_id, ContractTrackLink.contract_id == existing.id).count()
        parties = (
            db.query(ContractParty)
            .filter(
                ContractParty.organization_id == org_id,
                ContractParty.contract_id == existing.id,
            )
            .count()
        )
        completeness = _build_completeness(
            documents=docs,
            tracks=tracks,
            parties=parties,
            effective_date=bool(existing.start_date),
            end_date_known=bool(existing.end_date) or (meta.get("end_date_specified") is False),
            territory=bool(existing.territory),
            term_present=bool(meta.get("term_summary")),
        )
        return {
            "status": "ok",
            "created": False,
            "idempotent_hit": True,
            "org_id": str(org_id),
            "contract_id": existing.id,
            "contract": {
                "id": existing.id,
                "org_id": str(org_id),
                "status": str(existing.status or "draft").lower(),
                "title": existing.title,
                "type": str(existing.type or "other").lower(),
                "territory": existing.territory,
                "effective_date": _iso_or_none(existing.start_date),
                "end_date": _iso_or_none(existing.end_date),
                "end_date_specified": bool(meta.get("end_date_specified", existing.end_date is not None)),
                "created_at": _iso_or_none(existing.created_at),
                "updated_at": _iso_or_none(existing.updated_at or existing.created_at),
                "overview": {
                    "type": str(existing.type or "other").lower(),
                    "territory": existing.territory,
                    "effective_date": _iso_or_none(existing.start_date),
                    "end_date": _iso_or_none(existing.end_date),
                    "end_date_note": "no_end_date_specified" if meta.get("end_date_specified") is False else None,
                },
            },
            "links": {
                "documents_created": docs,
                "tracks_linked": tracks,
                "parties_linked": parties,
            },
            "linked_tracks_count": tracks,
            "warnings": list(meta.get("extract_warnings") or []),
            "completeness": completeness,
        }

    title = (
        payload.get("title")
        or overrides.get("title")
        or provided_extract.get("title")
        or extracted_title
        or _safe_title_from_filename(file_name)
    ).strip()
    start_date = _parse_date(
        payload.get("start_date")
        or overrides.get("start_date")
        or extract_dates.get("effective_date")
        or extraction_payload.get("effective_date")
        or extraction_payload.get("start_date")
    )
    end_date = _parse_date(
        payload.get("end_date")
        or overrides.get("end_date")
        or extract_dates.get("end_date")
        or extract_dates.get("expiration_date")
        or extraction_payload.get("end_date")
    )
    territory = payload.get("territory") or extract_terms.get("territory")

    raw_track_ids = payload.get("track_ids") or []
    if raw_track_ids is None:
        raw_track_ids = []
    if not isinstance(raw_track_ids, list):
        raise ValueError("invalid_track_ids")

    track_ids = []
    for item in raw_track_ids:
        try:
            track_ids.append(int(item))
        except Exception:
            raise ValueError("invalid_track_ids")
    track_ids = sorted(list(set(track_ids)))

    valid_tracks = []
    if track_ids:
        valid_tracks = db.query(Track).filter(Track.organization_id == org_id, Track.id.in_(track_ids)).all()
        valid_ids = {t.id for t in valid_tracks}
        missing_ids = [tid for tid in track_ids if tid not in valid_ids]
        if missing_ids:
            raise ValueError("invalid_track_ids:" + ",".join(str(x) for x in missing_ids))

    requested_party_links = _normalize_party_links(payload.get("party_links") or [])

    warnings = []
    if not extract_dates.get("effective_date"):
        warnings.append("missing_effective_date")
    if not (extract_dates.get("end_date") or extract_dates.get("expiration_date")):
        warnings.append("no_end_date_specified")
    if not extract_terms.get("territory"):
        warnings.append("missing_territory")

    meta = {
        "idempotency_key": idempotency_key,
        "payload_hash": payload_hash,
        "end_date_specified": bool(
            extract_dates.get("end_date_specified")
            or extract_dates.get("end_date")
            or extract_dates.get("expiration_date")
            or end_date is not None
        ),
        "governing_law": extract_terms.get("governing_law"),
        "term_summary": extract_terms.get("term_text"),
        "extract_warnings": warnings,
    }

    contract = Contract(
        contract_number=_next_contract_number(db, org_id),
        organization_id=org_id,
        title=title,
        status=status,
        type=contract_type,
        start_date=start_date,
        end_date=end_date,
        signed_date=start_date,
        territory=territory,
        created_by=user_id,
        notes=_append_meta(None, meta),
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)

    contract_dir = Path(settings.UPLOAD_DIR) / "contracts" / str(contract.id)
    contract_dir.mkdir(parents=True, exist_ok=True)
    dest_path = contract_dir / file_name
    dest_path.write_bytes(file_content)

    document = ContractDocument(
        contract_id=contract.id,
        organization_id=org_id,
        file_path=str(dest_path).replace(settings.UPLOAD_DIR, "/uploads"),
        file_name=file_name,
        version=1,
        uploaded_by=user_id,
        checksum=parsed["sha256"],
        mime_type="application/pdf",
        size_bytes=len(file_content),
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    linked_tracks_count = 0
    for track in valid_tracks:
        existing_asset = (
            db.query(ContractAsset)
            .filter(
                ContractAsset.organization_id == org_id,
                ContractAsset.contract_id == contract.id,
                ContractAsset.asset_type == "Track",
                ContractAsset.asset_id == track.id,
            )
            .first()
        )
        if not existing_asset:
            db.add(
                ContractAsset(
                    organization_id=org_id,
                    contract_id=contract.id,
                    asset_type="Track",
                    asset_id=track.id,
                    scope_type="INCLUSION",
                    notes="Linked during create_from_extract",
                )
            )

        existing_link = (
            db.query(ContractTrackLink)
            .filter(
                ContractTrackLink.organization_id == org_id,
                ContractTrackLink.contract_id == contract.id,
                ContractTrackLink.track_id == track.id,
            )
            .first()
        )
        if existing_link:
            continue
        db.add(
            ContractTrackLink(
                organization_id=org_id,
                contract_id=contract.id,
                track_id=track.id,
            )
        )
        linked_tracks_count += 1
    db.commit()

    parties_payload = []
    for link in requested_party_links:
        if link["entity_type"] == "external":
            parties_payload.append(
                {
                    "role": link["role"],
                    "entity_type": "external",
                    "display_name": link["external_name"],
                    "split_percent": link.get("split_percent"),
                    "notes": link.get("notes"),
                }
            )
        else:
            parties_payload.append(
                {
                    "role": link["role"],
                    "entity_type": link["entity_type"],
                    "entity_id": link["entity_id"],
                    "split_percent": link.get("split_percent"),
                    "notes": link.get("notes"),
                }
            )
    parties_linked = save_parties(
        db=db,
        user=SimpleNamespace(organization_id=org_id),
        contract_id=contract.id,
        parties=parties_payload,
        confirm=True,
    )
    parties_count = (
        db.query(ContractParty)
        .filter(
            ContractParty.organization_id == org_id,
            ContractParty.contract_id == contract.id,
        )
        .count()
    )

    completeness = _build_completeness(
        documents=1,
        tracks=linked_tracks_count,
        parties=parties_count,
        effective_date=bool(contract.start_date),
        end_date_known=bool(contract.end_date) or (meta.get("end_date_specified") is False),
        territory=bool(contract.territory),
        term_present=bool(meta.get("term_summary")),
    )

    return {
        "status": "ok",
        "created": True,
        "org_id": str(org_id),
        "contract_id": contract.id,
        "contract": {
            "id": contract.id,
            "org_id": str(org_id),
            "status": str(contract.status or "draft").lower(),
            "title": contract.title,
            "type": str(contract.type or "other").lower(),
            "territory": contract.territory,
            "effective_date": _iso_or_none(contract.start_date),
            "end_date": _iso_or_none(contract.end_date),
            "end_date_specified": bool(meta.get("end_date_specified", contract.end_date is not None)),
            "created_at": _iso_or_none(contract.created_at),
            "updated_at": _iso_or_none(contract.updated_at or contract.created_at),
            "overview": {
                "type": str(contract.type or "other").lower(),
                "territory": contract.territory,
                "effective_date": _iso_or_none(contract.start_date),
                "end_date": _iso_or_none(contract.end_date),
                "end_date_note": "no_end_date_specified" if meta.get("end_date_specified") is False else None,
            },
        },
        "document": {
            "id": document.id,
            "filename": document.file_name,
        },
        "links": {
            "documents_created": 1,
            "tracks_linked": linked_tracks_count,
            "parties_linked": parties_linked,
        },
        "linked_tracks_count": linked_tracks_count,
        "warnings": warnings,
        "completeness": completeness,
    }
