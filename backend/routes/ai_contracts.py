import logging
import uuid
import hashlib
from pathlib import Path

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
    ResolveRequestV1
)
from services.ai.parsing.pdf_extract import extract_text_from_pdf
from services.ai.extractors.contract_extractor_v1 import extract_contract_intelligence
from services.ai.extractors.contract_extractor_llm_v1 import extract_contract_intelligence_llm_v1
from services.ai.llm.errors import LLMDisabledError, LLMParseError, LLMRequestError
from services.ai.matchers.contract_resolver_v1 import resolve_entities
from services.ai.audit import log_ai_request

router = APIRouter()
logger = logging.getLogger(__name__)


def _extract_request_hash(org_id, user_id, filename: str, text: str) -> str:
    sample = (text or "")[:2048]
    payload = f"{org_id}|{user_id}|{filename}|{sample}"
    return hashlib.sha256(payload.encode()).hexdigest()

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

@router.post("/extract", response_model=ContractExtractionV1, dependencies=[Depends(ensure_ai_contract_intel_enabled)])
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
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "detail": "pdf_parse_failed",
                    "hint": "only PDF files are supported",
                },
            )

        content = await file.read()
        parsed = extract_text_from_pdf(content)
        parse_text = parsed.get("text", "") or ""
        if parse_text.startswith("Error during PDF extraction:"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "detail": "pdf_parse_failed",
                    "hint": "try a different PDF export or scan quality",
                },
            )

        extraction = None
        llm_warning = None
        if settings.llm_extract_enabled():
            try:
                extraction = extract_contract_intelligence_llm_v1(
                    text=parse_text,
                    filename=file.filename,
                    settings=settings,
                    org_id=current_user.organization_id,
                    user_id=current_user.id,
                )
            except (LLMRequestError, LLMParseError) as llm_exc:
                logger.warning("contract extract llm failed; fallback deterministic: %s", str(llm_exc))
                llm_warning = "llm_failed_fallback_deterministic"
        else:
            llm_warning = "llm_disabled_fallback"

        if extraction is None:
            extraction = extract_contract_intelligence(parse_text, filename=file.filename)

        if llm_warning:
            extraction.warnings = list(extraction.warnings or []) + [llm_warning]

        extraction.contract_date = extraction.effective_date or extraction.start_date or extraction.contract_date
        extraction.expiration_date = extraction.end_date or extraction.expiration_date
        if (not extraction.contract_title) or extraction.contract_title == "Governed Extraction (Deterministic V1)":
            extraction.contract_title = Path(file.filename).stem
            extraction.warnings = list(extraction.warnings or []) + ["contract_title_fallback_from_filename"]

        request_hash = _extract_request_hash(
            current_user.organization_id,
            current_user.id,
            file.filename,
            parse_text,
        )

        # Audit logging (hash only)
        log_ai_request(
            db=db,
            org_id=current_user.organization_id,
            user_id=current_user.id,
            action="contract_extraction",
            message=f"Extracted PDF hash: {parsed['sha256']} req:{request_hash}",
            tool="contract_extractor:llm_v1" if extraction.parser_version.startswith("llm_v1:") else "contract_extractor:deterministic",
            parser_version=extraction.parser_version or "contract_extractor_v1.2.2",
        )
        return extraction
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
    
    run_id = persist_resolution_results(
        db=db,
        org_id=current_user.organization_id,
        user_id=current_user.id,
        req=req
    )
    
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
