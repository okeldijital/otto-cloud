import logging
import json
import uuid
import hashlib
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.release import Release
from dependencies import get_current_user
from config import settings
from schemas.ai_contracts import (
    ContractExtractionV1,
    ResolvedContractProposalV1,
    ResolveRequestV1,
)
from schemas.ai_contracts_bulk import ExtractBulkResponse
from schemas.ai_contracts_v2 import ContractExtractV2
from schemas.ai_track_mapping import TrackMapPlanRequest, TrackMapPlanResponse
from services.ai.parsing.pdf_extract import extract_text_from_pdf
from services.ai.extractors.contract_extractor_v1 import extract_contract_intelligence
from services.ai.extractors.contract_extractor_deterministic_v2 import deterministic_extract_v2
from services.ai.extractors.contract_extractor_v2 import HybridExtractError, extract_contract_v2_hybrid
from services.ai.matchers.contract_resolver_v1 import resolve_entities
from services.ai.track_mapping.track_map_plan_v1 import build_track_map_plan
from services.ai.audit import log_ai_request

router = APIRouter()
logger = logging.getLogger(__name__)


def _extract_request_hash(org_id, user_id, filename: str, text: str) -> str:
    sample = (text or "")[:2048]
    payload = f"{org_id}|{user_id}|{filename}|{sample}"
    return hashlib.sha256(payload.encode()).hexdigest()


def _normalize_extract_result(extraction_v2: ContractExtractV2, filename: str) -> dict[str, Any]:
    legacy_payload = {
        "contract_title": extraction_v2.contract_title or Path(filename).stem,
        "start_date": extraction_v2.start_date.isoformat() if extraction_v2.start_date else None,
        "end_date": extraction_v2.end_date.isoformat() if extraction_v2.end_date else None,
    }
    v2_payload = _extract_v2_response_data(extraction_v2)
    return {
        "version": "v2",
        "data": v2_payload,
        "legacy": legacy_payload,
        "legacy_v1": legacy_payload,
        **legacy_payload,
    }


def _extract_contract_v2_for_file(content: bytes, filename: str, current_user: User) -> tuple[ContractExtractV2, dict[str, Any], str]:
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "detail": "pdf_parse_failed",
                "hint": "only PDF files are supported",
            },
        )
    parsed = extract_text_from_pdf(content)
    parse_text = parsed.get("text", "") or ""
    if parse_text.startswith("Error during PDF extraction:"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "detail": "pdf_parse_failed",
                "hint": "try a different PDF export or scan quality",
            },
        )
    try:
        extraction_v2 = extract_contract_v2_hybrid(
            text=parse_text,
            filename=filename,
            file_sha256=parsed["sha256"],
            page_count=parsed.get("page_count"),
            settings=settings,
            org_id=current_user.organization_id,
            user_id=current_user.id,
        )
    except HybridExtractError as hybrid_exc:
        logger.warning("contract extract hybrid failure; hard fallback deterministic: %s", str(hybrid_exc))
        extraction_v2 = deterministic_extract_v2(
            text=parse_text,
            filename=filename,
            file_sha256=parsed["sha256"],
            page_count=parsed.get("page_count"),
        )
        extraction_v2.warnings = list(extraction_v2.warnings or []) + ["hybrid_orchestrator_failed_fallback_deterministic"]

    return extraction_v2, parsed, {"text": parse_text}

def ensure_ai_contract_intel_enabled():
    """Dependency to check if contract intelligence is enabled"""
    if not settings.AI_ENABLED or not settings.AI_CONTRACT_INTEL_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI module disabled"
        )


def ensure_ai_contract_intake_enabled():
    """Dependency to check if contract intake planner is enabled"""
    if (
        not settings.AI_ENABLED
        or not settings.AI_CONTRACT_INTEL_ENABLED
        or not settings.AI_CONTRACT_INTAKE_ENABLED
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI module disabled"
        )


def ensure_ai_contract_track_map_enabled():
    if (
        not settings.AI_ENABLED
        or not settings.AI_CONTRACT_INTEL_ENABLED
        or not settings.AI_CONTRACT_TRACK_MAP_ENABLED
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI module disabled"
        )


def _version_hint(raw: str | None) -> str | None:
    src = (raw or "").lower()
    if not src:
        return None
    for hint in ("radio edit", "remix", "instrumental", "clean", "explicit"):
        if hint in src:
            return hint
    return None


def _extract_v2_response_data(extraction_v2: ContractExtractV2) -> dict:
    parties = [
        {
            "name": p.display_name,
            "display_name": p.display_name,
            "role": p.role,
            "confidence": float(p.confidence or 0.0),
        }
        for p in (extraction_v2.parties or [])
    ]

    splits = []
    for split in (extraction_v2.splits or []):
        party_name = split.party_name
        party_role = None
        if split.party_ref is not None and split.party_ref < len(extraction_v2.parties or []):
            party_obj = extraction_v2.parties[split.party_ref]
            party_name = party_name or party_obj.display_name
            party_role = party_obj.role
        splits.append(
            {
                "scope": split.split_type,
                "percent": float(split.percent or 0.0),
                "party_name": party_name,
                "party_role": party_role,
                "evidence": " | ".join(split.evidence or []),
            }
        )

    tracks = []
    for track in (extraction_v2.tracks_mentioned or []):
        tracks.append(
            {
                "raw_mention": track.title,
                "normalized_title": track.title.strip() if track.title else None,
                "version_hint": _version_hint(track.title),
                "confidence": float(track.confidence or 0.0),
            }
        )

    key_terms = {"territory": None, "term_text": None, "grant_of_rights": None}
    for term in (extraction_v2.terms or []):
        if term.term_type == "territory" and not key_terms["territory"]:
            key_terms["territory"] = term.summary
        elif term.term_type == "grant_of_rights" and not key_terms["grant_of_rights"]:
            key_terms["grant_of_rights"] = term.summary
        elif term.term_type in {"termination", "other"} and not key_terms["term_text"]:
            key_terms["term_text"] = term.summary

    warnings = list(extraction_v2.warnings or [])
    end_date_specified = extraction_v2.end_date is not None
    if not end_date_specified and "no_end_date_specified" not in warnings:
        warnings.append("no_end_date_specified")

    return {
        "contract_title": extraction_v2.contract_title,
        "dates": {
            "effective_date": extraction_v2.effective_date.isoformat() if extraction_v2.effective_date else None,
            "contract_date": extraction_v2.start_date.isoformat() if extraction_v2.start_date else None,
            "expiration_date": extraction_v2.end_date.isoformat() if extraction_v2.end_date else None,
            "end_date": extraction_v2.end_date.isoformat() if extraction_v2.end_date else None,
            "end_date_specified": end_date_specified,
        },
        "parties": parties,
        "tracks": tracks,
        "splits": splits,
        "key_terms": key_terms,
        "warnings": warnings,
        # Backward-compatible carry-through for existing consumers
        "effective_date": extraction_v2.effective_date.isoformat() if extraction_v2.effective_date else None,
        "start_date": extraction_v2.start_date.isoformat() if extraction_v2.start_date else None,
        "end_date": extraction_v2.end_date.isoformat() if extraction_v2.end_date else None,
        "end_date_note": extraction_v2.end_date_note,
        "terms": [t.model_dump(mode="json") for t in (extraction_v2.terms or [])],
        "tracks_mentioned": [t.model_dump(mode="json") for t in (extraction_v2.tracks_mentioned or [])],
        "splits_total": extraction_v2.splits_total,
        "raw_confidence": extraction_v2.raw_confidence,
        "parser_version": extraction_v2.parser_version,
        "errors": extraction_v2.errors,
        "source": extraction_v2.source.model_dump(mode="json"),
    }


def _entity_hint_from_role(role: str | None) -> str:
    raw = (role or "").lower()
    if raw in {"artist", "remix_artist", "producer"}:
        return "artist"
    if raw in {"label", "organization", "publisher"}:
        return "organization"
    if raw in {"individual", "composer_owner"}:
        return "individual"
    return "unknown"

@router.post("/extract", dependencies=[Depends(ensure_ai_contract_intel_enabled)])
async def extract_contract_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a PDF contract and extract structured intelligence.
    Writes audit log with file hash.
    """
    try:
        content = await file.read()
        extraction_v2, parsed, parsed_meta = _extract_contract_v2_for_file(content, file.filename, current_user)
        parse_text = parsed_meta["text"]

        # Optional transitional legacy payload for existing callers.
        extraction_legacy = extract_contract_intelligence(parse_text, filename=file.filename)
        extraction_legacy.contract_title = extraction_v2.contract_title or extraction_legacy.contract_title
        extraction_legacy.parser_version = extraction_v2.parser_version or extraction_legacy.parser_version
        extraction_legacy.raw_confidence = extraction_v2.raw_confidence
        extraction_legacy.warnings = list(dict.fromkeys(list(extraction_legacy.warnings or []) + list(extraction_v2.warnings or [])))
        extraction_legacy.contract_date = extraction_legacy.effective_date or extraction_legacy.start_date or extraction_legacy.contract_date
        extraction_legacy.expiration_date = extraction_legacy.end_date or extraction_legacy.expiration_date
        if (not extraction_legacy.contract_title) or extraction_legacy.contract_title == "Governed Extraction (Deterministic V1)":
            extraction_legacy.contract_title = Path(file.filename).stem
            extraction_legacy.warnings = list(extraction_legacy.warnings or []) + ["contract_title_fallback_from_filename"]

        request_hash = _extract_request_hash(
            current_user.organization_id,
            current_user.id,
            file.filename,
            parse_text,
        )

        # Audit logging (hash only)
        try:
            log_ai_request(
                db=db,
                org_id=current_user.organization_id,
                user_id=current_user.id,
                action="contract_extraction",
                message=f"Extracted PDF hash: {parsed['sha256']} req:{request_hash}",
                tool="contract_extractor:v2_hybrid",
                parser_version=extraction_v2.parser_version or "deterministic_v2",
            )
        except Exception:
            logger.warning("contract extraction audit write skipped")
        return {
            **extraction_legacy.model_dump(mode="json"),
            **_normalize_extract_result(extraction_v2, file.filename),
        }
    except HTTPException:
        raise
    except Exception:
        error_id = str(uuid.uuid4())
        logger.exception("contract extract failed error_id=%s", error_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "detail": "contract_extract_failed",
                "error_id": error_id,
                "hint": "try a different PDF export or scan quality",
            },
        )


@router.post("/extract_bulk", dependencies=[Depends(ensure_ai_contract_intel_enabled)], response_model=ExtractBulkResponse)
async def extract_contract_bulk_endpoint(
    files: list[UploadFile] = File(...),
    options: str | None = Form(None),
    batch_id: str | None = Form(None),
    tracks_only: str | None = Form(None),
    parser_version: str | None = Form("v2"),
    force_deterministic: bool = Form(False),
    max_pages: int = Form(20),
    return_text: bool = Form(False),
    current_user: User = Depends(get_current_user),
):
    if not files:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"detail": "validation_error", "errors": [{"field": "files", "code": "required", "message": "At least one PDF file is required."}]},
        )

    _ = parser_version, force_deterministic, max_pages, return_text, tracks_only
    if options:
        try:
            json.loads(options)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={"detail": "validation_error", "errors": [{"field": "options", "code": "invalid_json", "message": "Options must be valid JSON."}]},
            )

    bad = []
    for idx, f in enumerate(files):
        if not f.filename.lower().endswith(".pdf"):
            bad.append({"field": f"files[{idx}]", "code": "not_pdf", "message": "Only PDF files are supported."})
    if bad:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail={"detail": "validation_error", "errors": bad})

    results = []
    for f in files:
        content = await f.read()
        sha256 = hashlib.sha256(content).hexdigest()
        try:
            extraction_v2, _, _ = _extract_contract_v2_for_file(content, f.filename, current_user)
            parties = extraction_v2.parties or []
            split_rows = []
            for s in (extraction_v2.splits or []):
                party_name = s.party_name
                party_role = None
                if s.party_ref is not None and 0 <= s.party_ref < len(parties):
                    party_obj = parties[s.party_ref]
                    party_name = party_name or party_obj.display_name
                    party_role = party_obj.role
                split_rows.append(
                    {
                        "scope": s.split_type.lower() if isinstance(s.split_type, str) else "other",
                        "percent": s.percent,
                        "party_name": party_name or "Unknown Party",
                        "role": party_role,
                        "notes": s.notes,
                        "evidence": " | ".join(s.evidence or []),
                    }
                )
            result = {
                "file_id": f"f_{len(results)+1:03d}",
                "filename": f.filename,
                "ok": True,
                "client_file_id": f.filename,
                "sha256": sha256,
                "status": "ok",
                "warnings": list(extraction_v2.warnings or []),
                "extract": {
                    "version": "v2",
                    "parser": {
                        "name": "hybrid_conservative_v2",
                        "llm_used": extraction_v2.parser_version.startswith("llm_v1"),
                        "parser_version": extraction_v2.parser_version,
                        "confidence": extraction_v2.raw_confidence,
                    },
                    "data": {
                        "title": extraction_v2.contract_title,
                        "type": "unknown",
                        "dates": {
                            "contract_date": extraction_v2.start_date.isoformat() if extraction_v2.start_date else None,
                            "effective_date": extraction_v2.effective_date.isoformat() if extraction_v2.effective_date else None,
                            "expiration_date": extraction_v2.end_date.isoformat() if extraction_v2.end_date else None,
                            "end_date": extraction_v2.end_date.isoformat() if extraction_v2.end_date else None,
                            "end_date_specified": bool(extraction_v2.end_date),
                        },
                        "parties": [
                            {
                                "name": p.display_name,
                                "display_name": p.display_name,
                                "role": p.role or "unknown",
                                "entity_hint": _entity_hint_from_role(getattr(p, "role", None)),
                                "confidence": p.confidence,
                                "evidence": " | ".join(getattr(p, "evidence", []) or []),
                            }
                            for p in (extraction_v2.parties or [])
                        ],
                        "tracks": [
                            {
                                "title": t.title,
                                "version": _version_hint(t.title),
                                "confidence": t.confidence,
                            }
                            for t in (extraction_v2.tracks_mentioned or [])
                            if t.title
                        ],
                        "splits": split_rows,
                        "key_terms": {
                            "territory": next((t.summary for t in extraction_v2.terms if t.term_type == "territory"), None) if extraction_v2.terms else None,
                            "governing_law": next((t.summary for t in extraction_v2.terms if t.term_type == "other" and "law" in (t.summary or "").lower()), None) if extraction_v2.terms else None,
                            "term_text": next((t.summary for t in extraction_v2.terms if t.term_type in {"termination", "other"}), None) if extraction_v2.terms else None,
                            "renewal_text": next((t.summary for t in extraction_v2.terms if "renew" in (t.summary or "").lower()), None) if extraction_v2.terms else None,
                        },
                        "warnings": extraction_v2.warnings or [],
                    },
                    "legacy_v1": {
                        "contract_title": extraction_v2.contract_title,
                        "start_date": extraction_v2.start_date.isoformat() if extraction_v2.start_date else None,
                        "end_date": extraction_v2.end_date.isoformat() if extraction_v2.end_date else None,
                    },
                },
            }
            results.append(result)
        except HTTPException as exc:
            detail = exc.detail if isinstance(exc.detail, dict) else {"detail": str(exc.detail)}
            results.append(
                {
                    "file_id": f"f_{len(results)+1:03d}",
                    "filename": f.filename,
                    "ok": False,
                    "client_file_id": f.filename,
                    "sha256": sha256,
                    "status": "error",
                    "warnings": [],
                    "error": {
                        "code": detail.get("detail", "pdf_parse_failed"),
                        "message": detail.get("detail", "Could not parse PDF"),
                        "hint": detail.get("hint", "Ensure the file is a valid PDF and not password-protected."),
                        "error_id": f"err_{uuid.uuid4().hex[:8]}",
                    },
                }
            )
        except Exception:
            results.append(
                {
                    "file_id": f"f_{len(results)+1:03d}",
                    "filename": f.filename,
                    "ok": False,
                    "client_file_id": f.filename,
                    "sha256": sha256,
                    "status": "error",
                    "warnings": [],
                    "error": {
                        "code": "pdf_parse_failed",
                        "message": "Could not parse PDF",
                        "hint": "Ensure the file is a valid PDF and not password-protected.",
                        "error_id": f"err_{uuid.uuid4().hex[:8]}",
                    },
                }
            )

    return {
        "version": "bulk_extract_v1",
        "org_id": str(current_user.organization_id),
        "batch_id": batch_id,
        "status": "ok",
        "results": results,
    }


@router.post(
    "/track_map_plan",
    response_model=TrackMapPlanResponse,
    dependencies=[Depends(ensure_ai_contract_track_map_enabled)],
)
async def track_map_plan_endpoint(
    req: TrackMapPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return build_track_map_plan(
        db=db,
        org_id=current_user.organization_id,
        req=req,
    )


from schemas.ai_linking import (
    ContractLinkSuggestRequestV1,
    ContractLinkSuggestResponseV1,
    AIResolutionRequestV1,
    AIResolutionResponseV1
)
from services.ai.linking.link_suggest_v1 import suggest_links
from services.ai.resolution.persist import persist_resolution_results

def ensure_ai_contract_resolve_enabled():
    """Dependency to check if contract resolution persistence is enabled"""
    if not settings.AI_ENABLED or not settings.AI_CONTRACT_INTEL_ENABLED or not settings.AI_CONTRACT_RESOLVE_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI module disabled"
        )

@router.post("/link_suggest", response_model=ContractLinkSuggestResponseV1, dependencies=[Depends(ensure_ai_contract_intel_enabled)])
async def link_suggest_endpoint(
    req: ContractLinkSuggestRequestV1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Read-only pass: Match extraction results to existing Catalog/Network entities.
    Returns suggested links with confidence scores.
    """
    extraction = req.extraction
    
    # Audit logging (hash only)
    try:
        log_ai_request(
            db=db,
            org_id=current_user.organization_id,
            user_id=current_user.id,
            action="contract_link_suggest",
            message=f"Link Suggest request for: {extraction.contract_title or 'Untitled'}",
            tool="contract_linker",
            parser_version=extraction.parser_version,
            linker_version="link_suggest_v1.0.0"
        )
    except Exception:
        logger.warning("link_suggest audit write skipped")
    
    response = suggest_links(db, str(current_user.organization_id), extraction)
    return response

@router.post("/resolve", response_model=AIResolutionResponseV1, dependencies=[Depends(ensure_ai_contract_resolve_enabled)])
async def resolve_contract_endpoint(
    req: AIResolutionRequestV1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Persist link/ignore decisions to the database.
    Governed: Does not modify core models.
    """
    # Audit logging
    try:
        log_ai_request(
            db=db,
            org_id=current_user.organization_id,
            user_id=current_user.id,
            action="contract_resolution_persist",
            message=f"Persisted resolution for: {req.contract_hash}",
            tool="contract_resolver",
            parser_version=req.extractor_version,
            linker_version=req.linker_version
        )
    except Exception:
        logger.warning("resolve audit write skipped")
    
    try:
        run_id = persist_resolution_results(
            db=db,
            org_id=current_user.organization_id,
            user_id=current_user.id,
            req=req
        )
    except Exception:
        logger.warning("resolve persistence skipped")
        run_id = 0
    
    return AIResolutionResponseV1(run_id=run_id)

@router.get("/resolve", dependencies=[Depends(ensure_ai_contract_resolve_enabled)])
async def resolve_contract_get_shim():
    """
    GET shim to prevent 405 Method Not Allowed leak.
    Always returns 404 to keep behavior consistent with 'disabled' state.
    """
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")


def _bucket_suggestions(suggestions: dict) -> dict:
    buckets = {
        "artists": [],
        "tracks": [],
        "works": [],
        "orgs": [],
        "individuals": [],
    }

    for _, rows in (suggestions or {}).items():
        for item in rows:
            mapped = {
                "entity_id": item.entity_id,
                "display_name": item.display_name,
                "confidence": item.confidence,
                "rationale": item.rationale,
            }
            if item.entity_type == "artist":
                buckets["artists"].append(mapped)
            elif item.entity_type == "track":
                buckets["tracks"].append(mapped)
            elif item.entity_type == "work":
                buckets["works"].append(mapped)
            elif item.entity_type == "organization":
                buckets["orgs"].append(mapped)
            elif item.entity_type == "individual":
                buckets["individuals"].append(mapped)

    return buckets


@router.post(
    "/intake/wizard_plan",
    dependencies=[Depends(ensure_ai_contract_intake_enabled)],
)
async def intake_wizard_plan(
    release_id: int = Form(...),
    file: UploadFile | None = File(None),
    contract_id: int | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    release = (
        db.query(Release)
        .filter(
            Release.id == release_id,
            Release.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not release:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")

    extraction = None
    if file is not None:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        content = await file.read()
        parsed = extract_text_from_pdf(content)
        extraction = extract_contract_intelligence(parsed["text"])
    else:
        extraction = ContractExtractionV1(
            contract_title=f"Release {release.title}",
            works_hints={"artists": [release.artist.name] if release.artist else [], "tracks": [], "releases": [release.title]},
            warnings=["No PDF provided; generated minimal extraction from release context."],
            parser_version="wizard_plan_stub_v1",
        )

    link_response = suggest_links(db, str(current_user.organization_id), extraction)
    suggestions = _bucket_suggestions(link_response.suggestions)

    return {
        "release": {
            "id": release.id,
            "title": release.title,
            "artist_id": release.artist_id,
            "artist_name": release.artist.name if release.artist else None,
        },
        "contract_id": contract_id,
        "extraction": extraction.model_dump(),
        "suggestions": suggestions,
        "confidence": {
            "overall": max(
                [item["confidence"] for rows in suggestions.values() for item in rows],
                default=0.0,
            )
        },
        "rationale": "Read-only wizard plan generated from extraction + org-scoped linker.",
    }


@router.post(
    "/intake/start",
    dependencies=[Depends(ensure_ai_contract_intake_enabled)],
)
async def intake_start(
    release_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    release = (
        db.query(Release)
        .filter(
            Release.id == release_id,
            Release.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not release:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")

    return {
        "status": "ready",
        "org_id": str(current_user.organization_id),
        "release": {
            "id": release.id,
            "title": release.title,
        },
    }
