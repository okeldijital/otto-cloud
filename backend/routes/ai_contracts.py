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
from services.ai.matchers.contract_resolver_v1 import resolve_entities
from services.ai.audit import log_ai_request

router = APIRouter()

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
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    content = await file.read()
    parsed = extract_text_from_pdf(content)
    
    extraction = extract_contract_intelligence(parsed["text"])
    
    # Audit logging (hash only)
    log_ai_request(
        db=db,
        org_id=current_user.organization_id,
        user_id=current_user.id,
        action="contract_extraction",
        message=f"Extracted PDF: {parsed['sha256']}",
        tool="pdf_extract",
        parser_version="contract_extractor_v1.2.2"
    )
    
    return extraction

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
