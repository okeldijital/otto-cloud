from fastapi import APIRouter, Depends, HTTPException, Request, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import json
import os
import shutil
from urllib.parse import urlparse

from database import get_db
from dependencies import get_current_user, get_current_organization_id
from repositories.contract_repository import contract_repository
from schemas.contract import (
    ContractResponse,
    ContractCreate,
    ContractUpdate,
    ContractPartyCreate,
    ContractAssetCreate,
    ContractSplitGroupCreate,
    ContractSplitCreate,
)
from schemas.contracts_list import ContractsListResponse, ContractCounts
from schemas.contracts_from_extract import CreateFromExtractRequest, CreateFromExtractResponse
from schemas.contracts_parties_bulk import SavePartiesRequest, SavePartiesResponse
from schemas.track import TrackByIdsRequest, TrackByIdsResponse
from models.contract import Contract, ContractDocument, ContractParty, ContractAsset, ContractSplitGroup, ContractSplit
from models.artist import Artist
from models.release import Release
from models.track import Track
from models.contract_track_links import ContractTrackLink
from models.work import Work
from models.network import Organization, Individual
from models.publisher import Publisher
from models.label import Label
from models.artist_membership import ArtistMembership
from config import settings
from utils.audit import audit_service
from services.status_quo import compute_contract_status
from services.contracts.completeness import compute_contract_completeness
from services.contract_create import create_contract_from_draft
from services.contracts import create_contract_from_extract
from services.contracts.save_parties import save_parties
from sqlalchemy.orm import joinedload
import uuid

router = APIRouter(
    tags=["Contracts"],
    responses={404: {"description": "Not found"}},
)


def save_upload_file(contract_id: int, file: UploadFile) -> str:
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in settings.ALLOWED_EXTENSIONS or ext not in ["pdf", "doc", "docx", "png", "jpg", "jpeg"]:
        raise HTTPException(status_code=400, detail="Unsupported file type; PDF preferred.")

    from utils.storage import storage_client
    unique_filename = f"contracts/{contract_id}/{file.filename}"
    try:
        saved_path = storage_client.save_file(file.file, unique_filename)
        return saved_path
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")


def _entity_org_id(obj):
    return getattr(obj, "organization_id", None)


def assert_same_org(entity_type: str, entity_id: int, org_id: int, db: Session):
    et = (entity_type or "").strip().lower()
    model_map = {
        "artist": Artist,
        "Artist": Artist,
        "label": Label,
        "Label": Label,
        "publisher": Publisher,
        "Publisher": Publisher,
        "release": Release,
        "Release": Release,
        "track": Track,
        "Track": Track,
        "work": Work,
        "Work": Work,
        "organization": Organization,
        "individual": Individual,
    }
    model = model_map.get(et) or model_map.get(entity_type)
    if not model:
        return
    record = db.query(model).filter(model.id == entity_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="linked_entity_not_found")
    rec_org = _entity_org_id(record)
    if rec_org is not None and rec_org != org_id:
        raise HTTPException(status_code=400, detail="cross_org_link_forbidden")


def inject_status_quo(contract: Optional[Contract], db: Session = None) -> Optional[Contract]:
    if contract:
        counts = _contract_counts(contract)
        completeness = _build_completeness_payload(contract, counts)
        status = compute_contract_status(contract, contract.documents)
        contract.status_quo = status
        contract.status_quo_reasons = [r.code for r in completeness.reasons]
        contract.counts = {
            "parties": counts["parties"],
            "assets": counts["assets"],
            "documents": counts["documents"],
            "tracks": counts["tracks"],
        }
        contract.completeness = completeness.model_dump(mode="json")
        contract.end_date_specified = completeness.signals.end_date_known
        contract.effective_date = contract.start_date
        contract.term_summary = _contract_meta(contract).get("term_summary")
        contract.governing_law = _contract_meta(contract).get("governing_law")
        contract.key_terms = {
            "term_text": contract.term_summary,
            "governing_law": contract.governing_law
        }
    return contract


def _contract_meta(contract: Contract) -> Dict[str, Any]:
    raw = getattr(contract, "notes", None) or ""
    marker = "\n[OTTO_META]"
    if marker not in raw:
        return {}
    try:
        _, tail = raw.rsplit(marker, 1)
        return json.loads(tail.strip() or "{}")
    except Exception:
        return {}


def _append_contract_meta(existing_notes: Optional[str], meta: Dict[str, Any]) -> str:
    clean_notes = (existing_notes or "")
    marker = "\n[OTTO_META]"
    if marker in clean_notes:
        clean_notes = clean_notes.rsplit(marker, 1)[0]
    return f"{clean_notes.rstrip()}{marker}{json.dumps(meta, sort_keys=True)}"


def _contract_counts(contract: Contract) -> Dict[str, int]:
    parties = len(getattr(contract, "parties", []) or [])
    documents = len(getattr(contract, "documents", []) or [])
    assets = list(getattr(contract, "assets", []) or [])
    tracks = sum(1 for a in assets if str(getattr(a, "asset_type", "")).lower() == "track")
    return {"parties": parties, "assets": len(assets), "documents": documents, "tracks": tracks}


def _build_completeness_payload(contract: Contract, counts: Dict[str, int]):
    meta = _contract_meta(contract)
    end_date_specified = meta.get("end_date_specified")
    if end_date_specified is None:
        end_date_specified = bool(getattr(contract, "end_date", None))
    end_date_known = bool(getattr(contract, "end_date", None)) or (end_date_specified is False)
    term_present = bool(meta.get("term_summary"))
    return compute_contract_completeness(
        documents_count=counts["documents"],
        tracks_count=counts["tracks"],
        parties_count=counts["parties"],
        territory=getattr(contract, "territory", None),
        effective_date_present=bool(getattr(contract, "start_date", None)),
        end_date_known=end_date_known,
        term_present=term_present,
    )


def _build_party_summary(party, db):
    """Build a single party summary dict with group/member info."""
    display_name = party.external_name or ""
    kind = "solo"
    member_preview = []
    artist_id = None

    if party.entity_id and party.entity_type:
        etype = party.entity_type.lower()
        if etype == "artist":
            artist = db.query(Artist).options(
                joinedload(Artist.memberships_as_group)
            ).filter(Artist.id == party.entity_id).first()
            if artist:
                display_name = artist.display_name
                artist_id = artist.id
                kind = artist.artist_kind or "solo"
                if kind == "group":
                    for m in (artist.memberships_as_group or []):
                        if m.member:
                            member_preview.append({"id": m.member.id, "name": m.member.name})
                    display_name = artist.display_with_members
        elif etype == "label":
            label = db.query(Label).filter(Label.id == party.entity_id).first()
            if label:
                display_name = label.name
        elif etype == "organization":
            org = db.query(Organization).filter(Organization.id == party.entity_id).first()
            if org:
                display_name = org.name
        elif etype == "individual":
            ind = db.query(Individual).filter(Individual.id == party.entity_id).first()
            if ind:
                display_name = f"{(ind.first_name or '').strip()} {(ind.last_name or '').strip()}".strip() or ind.email or "Unnamed"

    if not display_name:
        display_name = f"{party.entity_type} #{party.entity_id}" if party.entity_id else "Unknown"

    return {
        "party_type": party.entity_type,
        "entity_id": party.entity_id,
        "artist_id": artist_id,
        "kind": kind,
        "role": party.role,
        "name": display_name.split(" (")[0] if " (" in display_name else display_name,
        "display": display_name,
        "member_preview": member_preview if kind == "group" else [],
    }


def _build_asset_title(asset, db):
    if not asset.asset_id:
        return asset.notes or "Unknown Asset"
    etype = str(asset.asset_type or "").strip().lower()
    if etype == "track":
        t = db.query(Track).filter(Track.id == asset.asset_id).first()
        if t: return t.title
    elif etype == "work":
        w = db.query(Work).filter(Work.id == asset.asset_id).first()
        if w: return w.title
    elif etype == "release":
        r = db.query(Release).filter(Release.id == asset.asset_id).first()
        if r: return r.title
    return f"{asset.asset_type} #{asset.asset_id}"


def _serialize_contract_item(contract: Contract, db=None) -> Dict[str, Any]:
    def _as_datetime(value):
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime.combine(value, datetime.min.time())
        return value

    counts = _contract_counts(contract)
    completeness = _build_completeness_payload(contract, counts)
    meta = _contract_meta(contract)
    end_date_specified = meta.get("end_date_specified")
    if end_date_specified is None:
        end_date_specified = bool(getattr(contract, "end_date", None))
    status_value = str(contract.status or "draft").lower()
    if status_value not in {"draft", "active", "expired", "archived"}:
        status_value = "draft"
    type_value = str(contract.type or "unknown").lower()
    if type_value not in {"recording", "publishing", "license", "other", "unknown"}:
        type_value = "unknown"
    effective_date = _as_datetime(contract.start_date)
    expiration_date = _as_datetime(contract.end_date)

    # Build parties summary
    parties_items = []
    if db and contract.parties:
        for party in contract.parties:
            parties_items.append(_build_party_summary(party, db))

    result = {
        "id": contract.id,
        "org_id": contract.organization_id,
        "status": status_value,
        "title": contract.title,
        "type": type_value,
        "territory": contract.territory,
        "effective_date": effective_date,
        "end_date": expiration_date,
        "end_date_specified": bool(end_date_specified),
        "created_at": _as_datetime(contract.created_at),
        "updated_at": _as_datetime(contract.updated_at or contract.created_at),
        "dates": {
            "effective_date": effective_date,
            "contract_date": effective_date,
            "expiration_date": expiration_date,
        },
        "counts": ContractCounts(
            documents=counts["documents"],
            tracks=counts["tracks"],
            parties=counts["parties"],
        ).model_dump(mode="json"),
        "completeness": completeness.model_dump(mode="json"),
        "parties_summary": {
            "count": len(parties_items),
            "items": parties_items,
        },
    }
    return result


def _new_entity_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


def _runtime_db_hint() -> Dict[str, str]:
    url = str(settings.DATABASE_URL or "")
    path_hint = ""
    if url.startswith("sqlite:///"):
        path_hint = url.replace("sqlite:///", "")
    else:
        parsed = urlparse(url)
        path_hint = parsed.path or "unknown"
    return {
        "db_id": "active",
        "db_path_hint": path_hint or "unknown",
    }


def ensure_contract_wizard_enabled():
    if not settings.AI_ENABLED or not settings.AI_CONTRACT_WIZARD_ENABLED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI module disabled")


@router.get("/contracts", response_model=ContractsListResponse)
def list_contracts(
    status: Optional[str] = None,
    status_filter: Optional[str] = None,
    q: Optional[str] = None,
    type_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    order_by: str = "created_at_desc",
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    effective_status = status_filter or status
    all_contracts = contract_repository.get_all_filtered(db, org_id, effective_status, type_filter, entity_type, entity_id)
    query_text = (q or "").strip().lower()
    if query_text:
        all_contracts = [
            c for c in all_contracts
            if query_text in ((c.title or "").lower() + " " + (c.contract_number or "").lower())
        ]

    rows = [_serialize_contract_item(c, db) for c in all_contracts]
    allowed_orders = {
        "created_at_desc",
        "created_at_asc",
        "title_asc",
        "title_desc",
        "completeness_desc",
        "completeness_asc",
    }
    if order_by not in allowed_orders:
        order_by = "created_at_desc"

    if order_by == "created_at_asc":
        rows.sort(key=lambda r: r.get("created_at") or "")
    elif order_by == "title_asc":
        rows.sort(key=lambda r: (r.get("title") or "").lower())
    elif order_by == "title_desc":
        rows.sort(key=lambda r: (r.get("title") or "").lower(), reverse=True)
    elif order_by == "completeness_desc":
        rows.sort(key=lambda r: r.get("completeness", {}).get("score", 0), reverse=True)
    elif order_by == "completeness_asc":
        rows.sort(key=lambda r: r.get("completeness", {}).get("score", 0))
    else:
        rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)

    limit = max(1, min(int(limit or 50), 200))
    offset = max(0, int(offset or 0))
    total = len(rows)
    rows = rows[offset:offset + limit]
    status_counts: Dict[str, int] = {}
    for row in rows:
        st = str(row.get("status") or "draft").lower()
        status_counts[st] = status_counts.get(st, 0) + 1

    audit_service.log(db, "VIEW_LIST", "contract", 0, current_user.id, organization_id=org_id)
    return {
        "contracts": rows,
        "counts": {"total": total, "by_status": status_counts},
        "meta": {"limit": limit, "offset": offset, "total": total},
        "items": rows,
        "page": {"limit": limit, "offset": offset, "total": total},
        "total": total,
    }


@router.post("/contracts", status_code=status.HTTP_201_CREATED)
async def create_contract(
    request: Request = None,
    title: str = Form(None),
    contract_number: str = Form(None),
    status_value: str = Form("Draft"),
    type: str = Form(None),
    start_date: str = Form(None),
    end_date: str = Form(None),
    signed_date: str = Form(None),
    territory: str = Form(None),
    exclusivity: bool = Form(False),
    notes: str = Form(None),
    release_id: int = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    # JSON document-first creation path.
    content_type = (request.headers.get("content-type") or "").lower()
    if "application/json" in content_type:
        payload = await request.json()
        draft_id = payload.get("draft_id")
        if not draft_id:
            raise HTTPException(status_code=422, detail="draft_id is required")
        overrides = payload.get("overrides") or {}
        try:
            return create_contract_from_draft(
                db=db,
                org_id=org_id,
                user_id=current_user.id,
                draft_id=str(draft_id),
                overrides=overrides,
            )
        except ValueError as exc:
            if str(exc) == "draft_not_found":
                raise HTTPException(status_code=404, detail="Not Found")
            raise HTTPException(status_code=422, detail=str(exc))

    # Create contract record
    def parse_date(value: Optional[str]):
        if value in (None, "", "null"):
            return None
        try:
            from datetime import datetime
            return datetime.strptime(value, "%Y-%m-%d").date()
        except Exception:
            return None

    if not title or not contract_number:
        raise HTTPException(status_code=422, detail="title and contract_number are required")

    payload = {
        "title": title,
        "contract_number": contract_number,
        "status": status_value,
        "type": type,
        "start_date": parse_date(start_date),
        "end_date": parse_date(end_date),
        "signed_date": parse_date(signed_date),
        "territory": territory,
        "exclusivity": exclusivity,
        "notes": notes,
    }
    contract = contract_repository.create_contract(db, payload, org_id, current_user.id)

    # Save document if provided
    if file:
        saved_path = save_upload_file(contract.id, file)
        contract_repository.add_document(
            db,
            contract.id,
            org_id,
            {"file_path": saved_path.replace(settings.UPLOAD_DIR, "/uploads"), "file_name": file.filename, "uploaded_by": current_user.id},
        )
    else:
        # Two-step creation allowed; remains Draft until document attached
        if status_value == "Active":
            raise HTTPException(status_code=400, detail="A PDF document is required before activating a contract.")

    # Auto-link Release if release_id provided (Requirement: Contract First linked to Release)
    if release_id:
        try:
            rel = db.query(Release).filter(Release.id == release_id).first()
            if rel:
                # 1. Link Release as Asset
                contract_repository.add_asset(db, contract.id, org_id, {
                    "asset_type": "Release",
                    "asset_id": rel.id,
                    "scope_type": "INCLUSION",
                    "notes": f"Primary Release: {rel.title}"
                })
                
                # 2. Link Artist as Party
                # Release has primary artist via artist_id or artist_ids (generic relation handling ideally needed, but assume single for now or first)
                # Release model has 'artist_id' (single) usually, let's check model if unsure, but standard Otto has artist_id.
                primary_artist_id = getattr(rel, 'artist_id', None)
                if primary_artist_id:
                     contract_repository.add_party(db, contract.id, org_id, {
                        "entity_type": "Artist",
                        "entity_id": primary_artist_id,
                        "role": "Artist",
                        "split_percent": None,
                        "notes": "Auto-linked from Release"
                     })
        except Exception as e:
            print(f"Error auto-linking release {release_id}: {e}")
            # Non-blocking, contract created anyway

    audit_service.log(db, "CREATE", "Contract", contract.id, current_user.id, changes=payload, organization_id=org_id)
    if file:
        audit_service.log(db, "UPLOAD", "ContractDocument", contract.id, current_user.id, changes={"document": file.filename}, organization_id=org_id)

    return inject_status_quo(contract_repository.get_with_details(db, contract.id, org_id), db=db)


@router.post(
    "/contracts/from_extract",
    dependencies=[Depends(ensure_contract_wizard_enabled)],
    response_model=CreateFromExtractResponse,
)
async def create_contract_via_extract(
    file: UploadFile = File(...),
    payload: str = Form(...),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    try:
        parsed_payload = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=422, detail="invalid payload json")
    try:
        if "extract" not in parsed_payload:
            overrides = parsed_payload.get("user_overrides") or {}
            parsed_payload = {
                "confirm_non_destructive": parsed_payload.get("confirm_non_destructive", False),
                "idempotency_key": parsed_payload.get("idempotency_key") or f"legacy:{(overrides.get('title') or parsed_payload.get('title') or 'contract')}",
                "extract_version": "v2",
                "extract": {
                    "title": overrides.get("title") or parsed_payload.get("title") or "Untitled Contract",
                    "type": str(parsed_payload.get("type") or parsed_payload.get("contract_type") or "other").lower(),
                    "dates": {
                        "contract_date": None,
                        "effective_date": overrides.get("start_date") or parsed_payload.get("start_date"),
                        "end_date": overrides.get("end_date") or parsed_payload.get("end_date"),
                        "end_date_specified": bool((overrides.get("end_date") or parsed_payload.get("end_date"))),
                    },
                    "key_terms": {
                        "territory": parsed_payload.get("territory"),
                        "governing_law": None,
                        "term_text": None,
                        "renewal_text": None,
                    },
                },
                "track_ids": parsed_payload.get("track_ids") or [],
                "create_parties": False,
                "party_links": [],
            }
        # Support wrapped extract payload:
        # {"extract":{"version":"v2","data":{...}}}
        ex = parsed_payload.get("extract")
        if isinstance(ex, dict) and isinstance(ex.get("data"), dict):
            data = ex.get("data") or {}
            dates = data.get("dates") or {}
            parsed_payload["extract"] = {
                "title": data.get("title") or data.get("contract_title") or "Untitled Contract",
                "type": str(data.get("type") or "unknown").lower(),
                "dates": {
                    "contract_date": dates.get("contract_date"),
                    "effective_date": dates.get("effective_date"),
                    "end_date": dates.get("end_date") or dates.get("expiration_date"),
                    "end_date_specified": bool(
                        dates.get("end_date_specified")
                        or dates.get("end_date")
                        or dates.get("expiration_date")
                    ),
                },
                "key_terms": data.get("key_terms") or {},
            }
        # normalize modern payload aliases
        ex = parsed_payload.get("extract") or {}
        if isinstance(ex, dict):
            ex_type = str(ex.get("type") or "unknown").lower()
            if ex_type in {"remix", "master"}:
                ex["type"] = "recording"
            elif ex_type not in {"recording", "publishing", "license", "other", "unknown"}:
                ex["type"] = "unknown"
        validated_payload = CreateFromExtractRequest.model_validate(parsed_payload)
    except Exception:
        raise HTTPException(status_code=422, detail="invalid payload schema")

    try:
        content = await file.read()
        result = create_contract_from_extract(
            db=db,
            org_id=org_id,
            user_id=current_user.id,
            file_name=file.filename,
            file_content=content,
            payload=validated_payload.model_dump(mode="json"),
        )
        audit_service.log(
            db,
            "CREATE",
            "Contract",
            result.get("contract_id") or (result.get("contract") or {}).get("id"),
            current_user.id,
            changes={"path": "/contracts/from_extract", "mode": "governed"},
            organization_id=org_id,
        )
        return result
    except ValueError as exc:
        msg = str(exc)
        if msg == "invalid_file":
            raise HTTPException(status_code=422, detail="invalid file")
        if msg == "confirmation_required":
            raise HTTPException(status_code=422, detail={"detail": "confirmation_required", "message": "confirm_non_destructive must be true"})
        if msg == "idempotency_conflict":
            raise HTTPException(status_code=409, detail={"detail": "idempotency_conflict", "message": "idempotency_key already used with different payload"})
        if msg.startswith("invalid_track_ids:"):
            ids = [int(x) for x in msg.split(":", 1)[1].split(",") if x.strip()]
            raise HTTPException(
                status_code=403,
                detail={
                    "detail": "invalid_track_ids",
                    "invalid_track_ids": ids,
                    "message": "Some track_ids do not exist or are not in your organization.",
                },
            )
        if msg in {"track_not_found_or_forbidden", "invalid_track_ids"}:
            raise HTTPException(
                status_code=403,
                detail={"detail": "invalid_track_ids", "invalid_track_ids": [], "message": "Some track_ids do not exist or are not in your organization."},
            )
        if msg in {"invalid_contract_type", "invalid_status"}:
            raise HTTPException(status_code=422, detail=msg)
        raise HTTPException(status_code=422, detail=msg)


@router.patch("/contracts/{contract_id}", response_model=ContractResponse)
def update_contract(
    contract_id: int,
    contract_data: ContractUpdate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contract = contract_repository.get(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Enforce Active requires at least one document
    if contract_data.status == "Active":
        docs = db.query(ContractDocument).filter(ContractDocument.contract_id == contract_id).count()
        if docs == 0:
            raise HTTPException(status_code=400, detail="A PDF document is required before activating a contract.")

    contract_dict = contract_data.model_dump(exclude_unset=True)
    if "key_terms" in contract_dict:
        key_terms = contract_dict.pop("key_terms")
        if key_terms:
            meta = _contract_meta(contract)
            if "term_text" in key_terms:
                meta["term_summary"] = key_terms["term_text"]
            if "governing_law" in key_terms:
                meta["governing_law"] = key_terms["governing_law"]
            contract_dict["notes"] = _append_contract_meta(contract.notes, meta)

    updated = contract_repository.update(db, contract, contract_dict)
    audit_service.log(db, "UPDATE", "Contract", contract.id, current_user.id, changes=contract_data.model_dump(exclude_unset=True), organization_id=org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id), db=db)


@router.delete("/contracts/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contract = contract_repository.get(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract_repository.delete(db, contract_id, org_id)
    audit_service.log(db, "DELETE", "Contract", contract_id, current_user.id, organization_id=org_id)
    return None


# Parties
@router.post("/contracts/{contract_id}/parties")
def add_party(
    contract_id: int,
    party_data: dict,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contract = contract_repository.get(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    # New bulk-save shape:
    # {confirm_non_destructive: true, items:[{role,source,party_ref|external_name,split}]}
    if isinstance(party_data, dict) and "items" in party_data:
        if party_data.get("confirm_non_destructive") is not True:
            raise HTTPException(status_code=422, detail="confirm_non_destructive must be true")
        items = party_data.get("items") or []
        saved_count = 0
        for item in items:
            role = (item.get("role") or "other").strip()
            source = (item.get("source") or "external_party").strip().lower()
            split = item.get("split") or {}
            split_percent = split.get("percent")
            if split_percent is not None and not (0 <= float(split_percent) <= 100):
                raise HTTPException(status_code=422, detail="split_percent must be between 0 and 100")

            entity_type = None
            entity_id = None
            external_name = None
            if source == "system_entity":
                party_ref = item.get("party_ref") or {}
                ref_type = (party_ref.get("ref_type") or "").strip().lower()
                ref_id = party_ref.get("ref_id")
                if not ref_type or not ref_id:
                    raise HTTPException(status_code=422, detail="party_ref is required for system_entity")
                entity_type = ref_type.capitalize()
                entity_id = int(ref_id)
                assert_same_org(ref_type, entity_id, org_id, db)
            else:
                external_name = (item.get("external_name") or "").strip()
                if not external_name:
                    raise HTTPException(status_code=422, detail="external_name is required for external_party")
                entity_type = "External"

            existing = (
                db.query(ContractParty)
                .filter(
                    ContractParty.contract_id == contract_id,
                    ContractParty.organization_id == org_id,
                    ContractParty.entity_type == entity_type,
                    ContractParty.entity_id == entity_id,
                    ContractParty.external_name == external_name,
                    ContractParty.role == role,
                )
                .first()
            )
            if existing:
                continue
            contract_repository.add_party(
                db,
                contract_id,
                org_id,
                {
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "external_name": external_name,
                    "role": role,
                    "split_percent": split_percent,
                    "notes": split.get("scope"),
                },
            )
            saved_count += 1

        full = contract_repository.get_with_details(db, contract_id, org_id)
        full = inject_status_quo(full, db=db)
        completeness = getattr(full, "completeness", {}) or {}
        score = int(completeness.get("score", 0))
        status_quo = str(completeness.get("color") or completeness.get("status_quo") or "red").lower()
        return {
            "status": "ok",
            "contract_id": contract_id,
            "saved_count": saved_count,
            "completeness": {
                "score": score,
                "status_quo": status_quo,
                "color": status_quo,
                "missing": list(completeness.get("missing") or []),
                "notes": list(completeness.get("notes") or []),
                "reasons": [r.get("code") for r in (completeness.get("reasons") or [])],
            },
        }

    # Legacy single-row shape
    legacy = ContractPartyCreate.model_validate(party_data)
    if legacy.entity_id and legacy.entity_type and legacy.entity_type != "External":
        assert_same_org(legacy.entity_type, legacy.entity_id, org_id, db)
    if legacy.split_percent is not None and not (0 <= float(legacy.split_percent) <= 100):
        raise HTTPException(status_code=422, detail="split_percent must be between 0 and 100")
    party_payload = legacy.model_dump()
    existing = (
        db.query(ContractParty)
        .filter(
            ContractParty.contract_id == contract_id,
            ContractParty.organization_id == org_id,
            ContractParty.entity_type == party_payload.get("entity_type"),
            ContractParty.entity_id == party_payload.get("entity_id"),
            ContractParty.external_name == party_payload.get("external_name"),
            ContractParty.role == party_payload.get("role"),
        )
        .first()
    )
    if not existing:
        contract_repository.add_party(db, contract_id, org_id, party_payload)
    audit_service.log(db, "UPDATE", "ContractParty", contract_id, current_user.id, changes={"add_party": legacy.model_dump()}, organization_id=org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id), db=db)


@router.post("/contracts/parties/save", response_model=SavePartiesResponse)
def save_contract_parties(
    payload: SavePartiesRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    saved = save_parties(
        db=db,
        user=current_user,
        contract_id=payload.contract_id,
        parties=[p.model_dump(mode="json") for p in payload.parties],
        confirm=payload.confirm_non_destructive,
    )
    return {"status": "ok", "contract_id": payload.contract_id, "parties_saved_count": saved}


@router.delete("/contracts/{contract_id}/parties/{party_id}", response_model=ContractResponse)
def remove_party(
    contract_id: int,
    party_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    party = db.query(ContractParty).filter(ContractParty.id == party_id, ContractParty.contract_id == contract_id, ContractParty.organization_id == org_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    db.delete(party)
    db.commit()
    audit_service.log(db, "UPDATE", "ContractParty", contract_id, current_user.id, changes={"remove_party": str(party_id)}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id), db=db)


# Assets
@router.post("/contracts/{contract_id}/assets", response_model=ContractResponse)
def add_asset(
    contract_id: int,
    asset_data: ContractAssetCreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contract = contract_repository.get(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    assert_same_org(asset_data.asset_type.capitalize(), asset_data.asset_id, org_id, db)
    asset_payload = asset_data.model_dump()
    existing = (
        db.query(ContractAsset)
        .filter(
            ContractAsset.contract_id == contract_id,
            ContractAsset.organization_id == org_id,
            ContractAsset.asset_type == asset_payload.get("asset_type"),
            ContractAsset.asset_id == asset_payload.get("asset_id"),
        )
        .first()
    )
    if not existing:
        contract_repository.add_asset(db, contract_id, org_id, asset_payload)
    audit_service.log(db, "UPDATE", "ContractAsset", contract_id, current_user.id, changes={"add_asset": asset_data.model_dump()}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id), db=db)


@router.get("/party_lookup")
def party_lookup(
    q: str = "",
    types: str = "artist,organization,individual,label",
    limit: int = 10,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    query = (q or "").strip()
    kinds = set([t.strip().lower() for t in (types or "").split(",") if t.strip()])
    results = []

    if not query:
        return {"results": []}

    if "artist" in kinds:
        rows = (
            db.query(Artist)
            .options(joinedload(Artist.memberships_as_group))
            .filter(Artist.organization_id == org_id, Artist.name.ilike(f"%{query}%"))
            .limit(limit)
            .all()
        )
        for r in rows:
            kind = r.artist_kind or "solo"
            member_preview = []
            if kind == "group":
                member_preview = [{"id": m.member.id, "name": m.member.name} for m in (r.memberships_as_group or []) if m.member]
            display = r.display_with_members if kind == "group" else r.display_name
            results.append({
                "entity_type": "artist", "id": r.id, "display_name": r.name,
                "kind": kind, "display": display, "member_preview": member_preview,
            })

    if "organization" in kinds:
        rows = (
            db.query(Organization)
            .filter(Organization.organization_id == org_id, Organization.name.ilike(f"%{query}%"))
            .limit(limit)
            .all()
        )
        for r in rows:
            results.append({"entity_type": "organization", "id": r.id, "display_name": r.name})

    if "label" in kinds:
        rows = (
            db.query(Label)
            .filter(Label.name.ilike(f"%{query}%"))
            .limit(limit)
            .all()
        )
        for r in rows:
            results.append({"entity_type": "label", "id": r.id, "display_name": r.name})

    if "individual" in kinds:
        rows = (
            db.query(Individual)
            .filter(
                Individual.organization_id == org_id,
                ((Individual.first_name + " " + Individual.last_name).ilike(f"%{query}%"))
                | (Individual.first_name.ilike(f"%{query}%"))
                | (Individual.last_name.ilike(f"%{query}%")),
            )
            .limit(limit)
            .all()
        )
        for r in rows:
            display = f"{(r.first_name or '').strip()} {(r.last_name or '').strip()}".strip() or r.email or "Unnamed Individual"
            results.append({"entity_type": "individual", "id": r.id, "display_name": display})

    return {"results": results[:limit]}


@router.get("/parties/search")
def parties_search(
    q: str = "",
    types: str = "artist,individual,organization",
    limit: int = 20,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    query = (q or "").strip()
    if not query:
        raise HTTPException(status_code=422, detail="q is required")
    kinds = {t.strip().lower() for t in (types or "").split(",") if t.strip()}
    out = []
    if "artist" in kinds:
        for r in (
            db.query(Artist)
            .filter(Artist.organization_id == org_id, Artist.name.ilike(f"%{query}%"))
            .limit(limit)
            .all()
        ):
            out.append({"ref_type": "artist", "ref_id": r.id, "display_name": r.name, "confidence": 0.92, "match_strategy": "normalized_contains"})
    if "organization" in kinds:
        for r in (
            db.query(Organization)
            .filter(Organization.organization_id == org_id, Organization.name.ilike(f"%{query}%"))
            .limit(limit)
            .all()
        ):
            out.append({"ref_type": "organization", "ref_id": r.id, "display_name": r.name, "confidence": 0.88, "match_strategy": "token_overlap"})
    if "individual" in kinds:
        for r in (
            db.query(Individual)
            .filter(
                Individual.organization_id == org_id,
                ((Individual.first_name + " " + Individual.last_name).ilike(f"%{query}%"))
                | (Individual.first_name.ilike(f"%{query}%"))
                | (Individual.last_name.ilike(f"%{query}%")),
            )
            .limit(limit)
            .all()
        ):
            display = f"{(r.first_name or '').strip()} {(r.last_name or '').strip()}".strip() or r.email or "Unnamed Individual"
            out.append({"ref_type": "individual", "ref_id": r.id, "display_name": display, "confidence": 0.85, "match_strategy": "normalized_contains"})
    return {"items": out[:limit], "limit": limit}


@router.get("/contracts/party_search")
def contracts_party_search(
    q: str = "",
    types: str = "artist,organization,individual,label",
    limit: int = 20,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    query = (q or "").strip()
    if not query:
        raise HTTPException(status_code=422, detail="q is required")
        
    kinds = set([t.strip().lower() for t in (types or "").split(",") if t.strip()])
    out = []
    
    if "artist" in kinds:
        for r in (
            db.query(Artist)
            .options(joinedload(Artist.memberships_as_group))
            .filter(Artist.organization_id == org_id, Artist.name.ilike(f"%{query}%"))
            .limit(limit)
            .all()
        ):
            kind = r.artist_kind or "solo"
            member_preview = []
            if kind == "group":
                member_preview = [{"id": m.member.id, "name": m.member.name} for m in (r.memberships_as_group or []) if m.member]
            display = r.display_with_members if kind == "group" else r.display_name
            out.append({
                "entity_type": "artist", "id": r.id, "display_name": r.name,
                "kind": kind, "display": display, "member_preview": member_preview,
            })
            
    if "organization" in kinds:
        for r in (
            db.query(Organization)
            .filter(Organization.organization_id == org_id, Organization.name.ilike(f"%{query}%"))
            .limit(limit)
            .all()
        ):
            out.append({"entity_type": "organization", "id": r.id, "display_name": r.name})

    if "label" in kinds:
        for r in (
            db.query(Label)
            .filter(Label.name.ilike(f"%{query}%"))
            .limit(limit)
            .all()
        ):
            out.append({"entity_type": "label", "id": r.id, "display_name": r.name})
            
    if "individual" in kinds:
        for r in (
            db.query(Individual)
            .filter(
                Individual.organization_id == org_id,
                ((Individual.first_name + " " + Individual.last_name).ilike(f"%{query}%"))
                | (Individual.first_name.ilike(f"%{query}%"))
                | (Individual.last_name.ilike(f"%{query}%")),
            )
            .limit(limit)
            .all()
        ):
            display = f"{(r.first_name or '').strip()} {(r.last_name or '').strip()}".strip() or r.email or "Unnamed Individual"
            out.append({"entity_type": "individual", "id": r.id, "display_name": display})
            
    return {"status": "ok", "org_id": str(org_id), "items": out[:limit]}


@router.post("/parties", status_code=status.HTTP_201_CREATED)
def create_party_inline(
    payload: dict,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    party_type = (payload.get("type") or "").strip().lower()
    display_name = (payload.get("display_name") or "").strip()
    if not display_name:
        raise HTTPException(status_code=422, detail="display_name is required")

    if party_type == "artist":
        existing = db.query(Artist).filter(Artist.organization_id == org_id, Artist.name == display_name).first()
        if existing:
            return {"ref_type": "artist", "ref_id": existing.id, "display_name": existing.name}
        row = Artist(organization_id=org_id, artist_id=_new_entity_id("ART"), name=display_name)
        db.add(row)
        db.commit()
        db.refresh(row)
        return {"ref_type": "artist", "ref_id": row.id, "display_name": row.name}

    if party_type == "organization":
        existing = db.query(Organization).filter(Organization.organization_id == org_id, Organization.name == display_name).first()
        if existing:
            return {"ref_type": "organization", "ref_id": existing.id, "display_name": existing.name}
        row = Organization(organization_id=org_id, name=display_name, org_type=(payload.get("org_type") or "Other"))
        db.add(row)
        db.commit()
        db.refresh(row)
        return {"ref_type": "organization", "ref_id": row.id, "display_name": row.name}

    if party_type == "individual":
        first, *rest = display_name.split(" ")
        row = Individual(
            organization_id=org_id,
            first_name=first,
            last_name=" ".join(rest).strip() or None,
            email=payload.get("email"),
            role=payload.get("role") or "Other",
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        out_name = f"{(row.first_name or '').strip()} {(row.last_name or '').strip()}".strip()
        return {"ref_type": "individual", "ref_id": row.id, "display_name": out_name}

    raise HTTPException(status_code=422, detail="type must be one of artist|individual|organization")


@router.post("/contracts/party_create", status_code=status.HTTP_201_CREATED)
def contracts_party_create(
    payload: dict,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    entity_type = str(payload.get("entity_type") or "").strip().lower()
    display_name = str(payload.get("display_name") or "").strip()
    if entity_type not in {"artist", "organization", "individual"}:
        raise HTTPException(status_code=422, detail="entity_type must be one of artist|individual|organization")
    if not display_name:
        raise HTTPException(status_code=422, detail="display_name is required")

    if entity_type == "artist":
        existing = db.query(Artist).filter(Artist.organization_id == org_id, Artist.name == display_name).first()
        if existing:
            return {"status": "created", "entity_type": "artist", "id": existing.id, "display_name": existing.name}
        
        artist_kind = str(payload.get("artist_kind") or "solo").strip().lower()
        if artist_kind not in {"solo", "group"}:
            artist_kind = "solo"
            
        row = Artist(organization_id=org_id, artist_id=_new_entity_id("ART"), name=display_name, artist_kind=artist_kind)
        db.add(row)
        db.commit()
        db.refresh(row)
        return {"status": "created", "entity_type": "artist", "id": row.id, "display_name": row.name, "kind": row.artist_kind}

    if entity_type == "organization":
        existing = db.query(Organization).filter(Organization.organization_id == org_id, Organization.name == display_name).first()
        if existing:
            return {"status": "created", "entity_type": "organization", "id": existing.id, "display_name": existing.name}
        row = Organization(organization_id=org_id, name=display_name, org_type=(payload.get("org_type") or "Other"))
        db.add(row)
        db.commit()
        db.refresh(row)
        return {"status": "created", "entity_type": "organization", "id": row.id, "display_name": row.name}

    first, *rest = display_name.split(" ")
    row = Individual(
        organization_id=org_id,
        first_name=first,
        last_name=" ".join(rest).strip() or None,
        email=payload.get("email"),
        role=payload.get("role") or "Other",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    out_name = f"{(row.first_name or '').strip()} {(row.last_name or '').strip()}".strip() or display_name
    return {"status": "created", "entity_type": "individual", "id": row.id, "display_name": out_name}


@router.get("/contracts/{contract_id}", response_model=ContractResponse)
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contract = contract_repository.get_with_details(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    audit_service.log(db, "VIEW", "Contract", contract.id, current_user.id, organization_id=org_id)
    
    # Inject actual names for UI
    for p in contract.parties:
        summary = _build_party_summary(p, db)
        p.display_name = summary.get("display")
        
    for a in contract.assets:
        a.asset_title = _build_asset_title(a, db)
        
    return inject_status_quo(contract, db=db)


@router.post("/contracts/{contract_id}/parties/batch_set")
def contracts_parties_batch_set(
    contract_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    if payload.get("confirm_non_destructive") is not True:
        raise HTTPException(status_code=422, detail={"detail": "confirmation_required", "message": "confirm_non_destructive must be true"})
    contract = contract_repository.get(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    items = payload.get("items") or []
    if not isinstance(items, list):
        raise HTTPException(status_code=422, detail="items must be a list")

    updated_count = 0
    for row in items:
        entity_type = str(row.get("entity_type") or "").strip().lower()
        entity_id = row.get("entity_id")
        role = str(row.get("role") or "other").strip().lower()
        split_percent = row.get("split_percent")
        notes = row.get("notes")
        if entity_type not in {"artist", "organization", "individual"}:
            raise HTTPException(status_code=422, detail="entity_type must be one of artist|organization|individual")
        if entity_id in (None, ""):
            raise HTTPException(status_code=422, detail="entity_id is required")
        assert_same_org(entity_type, int(entity_id), org_id, db)
        if split_percent is not None and not (0 <= float(split_percent) <= 100):
            raise HTTPException(status_code=422, detail="split_percent must be between 0 and 100")

        storage_entity_type = entity_type.capitalize()
        existing = (
            db.query(ContractParty)
            .filter(
                ContractParty.contract_id == contract_id,
                ContractParty.organization_id == org_id,
                ContractParty.entity_type == storage_entity_type,
                ContractParty.entity_id == int(entity_id),
            )
            .first()
        )
        if existing:
            existing.role = role
            existing.split_percent = split_percent
            if notes is not None:
                existing.notes = notes
        else:
            db.add(
                ContractParty(
                    contract_id=contract_id,
                    organization_id=org_id,
                    entity_type=storage_entity_type,
                    entity_id=int(entity_id),
                    role=role,
                    split_percent=split_percent,
                    notes=notes,
                )
            )
        updated_count += 1

    db.commit()
    full = inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id), db=db)
    completeness = getattr(full, "completeness", {}) or {}
    return {
        "status": "ok",
        "contract_id": contract_id,
        "updated_count": updated_count,
        "completeness": {
            "score": int(completeness.get("score", 0)),
            "color": str(completeness.get("color") or completeness.get("status_quo") or "red").lower(),
            "missing": list(completeness.get("missing") or []),
            "notes": list(completeness.get("notes") or []),
        },
    }


@router.post("/contracts/{contract_id}/tracks/batch_set")
def contracts_tracks_batch_set(
    contract_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    if payload.get("confirm_non_destructive") is not True:
        raise HTTPException(status_code=422, detail={"detail": "confirmation_required", "message": "confirm_non_destructive must be true"})
    contract = contract_repository.get(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    track_ids_raw = payload.get("track_ids") or []
    if not isinstance(track_ids_raw, list):
        raise HTTPException(status_code=422, detail="track_ids must be a list")

    track_ids = []
    for item in track_ids_raw:
        try:
            track_ids.append(int(item))
        except Exception:
            raise HTTPException(status_code=422, detail="track_ids must be integers")
    track_ids = sorted(list(set(track_ids)))
    if not track_ids:
        return {"status": "ok", "contract_id": contract_id, "linked_tracks_count": 0}

    valid_tracks = db.query(Track).filter(Track.organization_id == org_id, Track.id.in_(track_ids)).all()
    valid_ids = {t.id for t in valid_tracks}
    missing_ids = [tid for tid in track_ids if tid not in valid_ids]
    if missing_ids:
        raise HTTPException(status_code=403, detail={"detail": "invalid_track_ids", "invalid_track_ids": missing_ids})

    linked = 0
    for track_id in track_ids:
        existing_link = (
            db.query(ContractTrackLink)
            .filter(
                ContractTrackLink.organization_id == org_id,
                ContractTrackLink.contract_id == contract_id,
                ContractTrackLink.track_id == track_id,
            )
            .first()
        )
        if not existing_link:
            db.add(
                ContractTrackLink(
                    organization_id=org_id,
                    contract_id=contract_id,
                    track_id=track_id,
                )
            )
            linked += 1

        existing_asset = (
            db.query(ContractAsset)
            .filter(
                ContractAsset.organization_id == org_id,
                ContractAsset.contract_id == contract_id,
                ContractAsset.asset_type == "Track",
                ContractAsset.asset_id == track_id,
            )
            .first()
        )
        if not existing_asset:
            db.add(
                ContractAsset(
                    organization_id=org_id,
                    contract_id=contract_id,
                    asset_type="Track",
                    asset_id=track_id,
                    scope_type="INCLUSION",
                    notes="Linked during batch_set",
                )
            )
    db.commit()

    full = inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id), db=db)
    completeness = getattr(full, "completeness", {}) or {}
    return {
        "status": "ok",
        "contract_id": contract_id,
        "linked_tracks_count": linked,
        "completeness": {
            "score": int(completeness.get("score", 0)),
            "color": str(completeness.get("color") or completeness.get("status_quo") or "red").lower(),
            "missing": list(completeness.get("missing") or []),
            "notes": list(completeness.get("notes") or []),
        },
    }


@router.post("/artists")
def create_artist_inline(
    payload: dict,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    existing = db.query(Artist).filter(Artist.organization_id == org_id, Artist.name == name).first()
    if existing:
        return {"id": existing.id, "name": existing.name}
    row = Artist(organization_id=org_id, artist_id=_new_entity_id("ART"), name=name)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "name": row.name}


@router.post("/organizations")
def create_organization_inline(
    payload: dict,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    existing = db.query(Organization).filter(Organization.organization_id == org_id, Organization.name == name).first()
    if existing:
        return {"id": existing.id, "name": existing.name}
    row = Organization(organization_id=org_id, name=name, org_type=(payload.get("org_type") or "Other"))
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "name": row.name}


@router.post("/individuals")
def create_individual_inline(
    payload: dict,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    first, *rest = name.split(" ")
    last = " ".join(rest).strip()
    row = Individual(
        organization_id=org_id,
        first_name=first,
        last_name=last or None,
        email=payload.get("email"),
        role=payload.get("role") or "Other",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    display = f"{(row.first_name or '').strip()} {(row.last_name or '').strip()}".strip()
    return {"id": row.id, "name": display}


@router.get("/tracks")
def lookup_tracks(
    q: str = "",
    query: str = "",
    limit: int = 10,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    needle = (q or query or "").strip()
    rows = (
        db.query(Track)
        .filter(Track.organization_id == org_id, Track.title.ilike(f"%{needle}%"))
        .limit(limit)
        .all()
    )
    items = [{"id": r.id, "display_name": r.title, "title": r.title} for r in rows]
    return {"results": items, "items": items}


@router.get("/tracks/search")
def tracks_search(
    q: str = "",
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    query = (q or "").strip()
    if not query:
        raise HTTPException(status_code=422, detail="q is required")
    base = (
        db.query(Track)
        .filter(Track.organization_id == org_id, Track.title.ilike(f"%{query}%"))
    )
    rows = base.offset(max(0, int(offset))).limit(max(1, min(int(limit), 200))).all()
    total_estimate = base.count()
    items = []
    for r in rows:
        artist_name = None
        release_title = None
        if getattr(r, "release", None) is not None:
            release_title = getattr(r.release, "title", None)
            artist = getattr(r.release, "artist", None)
            artist_name = getattr(artist, "name", None) if artist is not None else None
        items.append(
            {
                "id": r.id,
                "display_name": r.title,
                "title": r.title,
                "artist": artist_name,
                "release": release_title,
                "artists": [],
                "version": None,
                "isrc": getattr(r, "isrc", None) or getattr(r, "isrc_code", None),
            }
        )
    return {
        "status": "ok",
        "org_id": str(org_id),
        "runtime": _runtime_db_hint(),
        "items": [
            {
                **row,
                "artist_display": row.get("artist"),
            }
            for row in items
        ],
        "limit": limit,
        "offset": offset,
        "total_estimate": total_estimate,
    }


@router.post("/tracks/by_ids", response_model=TrackByIdsResponse)
def tracks_by_ids(
    payload: TrackByIdsRequest,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    ids = sorted({int(x) for x in (payload.ids or []) if int(x) > 0})
    if not ids:
        return {"items": []}
    rows = (
        db.query(Track)
        .filter(Track.organization_id == org_id, Track.id.in_(ids))
        .all()
    )
    items = [{"id": r.id, "title": r.title or f"Track #{r.id}"} for r in rows]
    return {"items": items}


@router.get("/works")
def lookup_works(
    q: str = "",
    limit: int = 10,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    rows = (
        db.query(Work)
        .filter(Work.organization_id == org_id, Work.title.ilike(f"%{(q or '').strip()}%"))
        .limit(limit)
        .all()
    )
    return {"results": [{"id": r.id, "title": r.title} for r in rows]}


@router.get("/releases")
def lookup_releases(
    q: str = "",
    limit: int = 10,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    rows = (
        db.query(Release)
        .filter(Release.organization_id == org_id, Release.title.ilike(f"%{(q or '').strip()}%"))
        .limit(limit)
        .all()
    )
    return {"results": [{"id": r.id, "title": r.title} for r in rows]}


@router.delete("/contracts/{contract_id}/assets/{asset_id}", response_model=ContractResponse)
def remove_asset(
    contract_id: int,
    asset_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    asset = db.query(ContractAsset).filter(ContractAsset.id == asset_id, ContractAsset.contract_id == contract_id, ContractAsset.organization_id == org_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    db.delete(asset)
    db.commit()
    audit_service.log(db, "UPDATE", "ContractAsset", contract_id, current_user.id, changes={"remove_asset": str(asset_id)}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id), db=db)


# Documents
@router.post("/contracts/{contract_id}/documents", response_model=ContractResponse)
async def upload_document(
    contract_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contract = contract_repository.get(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    saved_path = save_upload_file(contract_id, file)
    file_path = saved_path if saved_path.startswith("http") else saved_path.replace(settings.UPLOAD_DIR, "/uploads")
    contract_repository.add_document(
        db,
        contract_id,
        org_id,
        {"file_path": file_path, "file_name": file.filename, "uploaded_by": current_user.id},
    )
    audit_service.log(db, "UPLOAD", "ContractDocument", contract_id, current_user.id, changes={"document": file.filename}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id), db=db)


@router.get("/contracts/{contract_id}/documents/{doc_id}/download")
def download_document(
    contract_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    doc = db.query(ContractDocument).filter(ContractDocument.id == doc_id, ContractDocument.contract_id == contract_id, ContractDocument.organization_id == org_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    real_path = doc.file_path.replace("/uploads", settings.UPLOAD_DIR)
    if not os.path.isfile(real_path):
        raise HTTPException(status_code=404, detail="File missing on disk")
    audit_service.log(db, "DOWNLOAD", "ContractDocument", contract_id, current_user.id, changes={"document": str(doc_id)}, organization_id=org_id)
    return FileResponse(real_path, filename=doc.file_name, media_type="application/pdf")


@router.get("/contracts/{contract_id}/documents/{doc_id}/preview")
def preview_document(
    contract_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    # same as download but let browser preview
    return download_document(contract_id, doc_id, db, org_id, current_user)


# Split groups
@router.post("/contracts/{contract_id}/split-groups", response_model=ContractResponse)
def add_split_group(
    contract_id: int,
    group_data: ContractSplitGroupCreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contract = contract_repository.get(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract_repository.add_split_group(db, contract_id, org_id, group_data.model_dump())
    audit_service.log(db, "UPDATE", "ContractSplitGroup", contract_id, current_user.id, changes={"add_split_group": group_data.model_dump()}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id), db=db)


@router.delete("/contracts/{contract_id}/split-groups/{group_id}", response_model=ContractResponse)
def remove_split_group(
    contract_id: int,
    group_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    group = db.query(ContractSplitGroup).filter(ContractSplitGroup.id == group_id, ContractSplitGroup.contract_id == contract_id, ContractSplitGroup.organization_id == org_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Split group not found")
    db.delete(group)
    db.commit()
    audit_service.log(db, "UPDATE", "ContractSplitGroup", contract_id, current_user.id, changes={"remove_split_group": str(group_id)}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id), db=db)


# Splits
@router.post("/contracts/{contract_id}/split-groups/{group_id}/splits", response_model=ContractResponse)
def add_split(
    contract_id: int,
    group_id: int,
    split_data: ContractSplitCreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    group = db.query(ContractSplitGroup).filter(ContractSplitGroup.id == group_id, ContractSplitGroup.contract_id == contract_id, ContractSplitGroup.organization_id == org_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Split group not found")
    contract_repository.add_split(db, group_id, org_id, split_data.model_dump())
    audit_service.log(db, "UPDATE", "ContractSplit", contract_id, current_user.id, changes={"add_split": split_data.model_dump()}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id), db=db)


@router.delete("/contracts/{contract_id}/split-groups/{group_id}/splits/{split_id}", response_model=ContractResponse)
def remove_split(
    contract_id: int,
    group_id: int,
    split_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    split = db.query(ContractSplit).join(ContractSplitGroup).filter(
        ContractSplit.id == split_id,
        ContractSplit.group_id == group_id,
        ContractSplitGroup.contract_id == contract_id,
        ContractSplit.organization_id == org_id
    ).first()
    if not split:
        raise HTTPException(status_code=404, detail="Split not found")
    db.delete(split)
    db.commit()
    audit_service.log(db, "UPDATE", "ContractSplit", contract_id, current_user.id, changes={"remove_split": str(split_id)}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id), db=db)
