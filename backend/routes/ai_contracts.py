from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
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
    ContractLinkSuggestResponseV1
)
from services.ai.linking.link_suggest_v1 import suggest_links

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

@router.post("/resolve", response_model=ResolvedContractProposalV1, dependencies=[Depends(ensure_ai_contract_intel_enabled)])
async def resolve_contract_endpoint(
    req: ResolveRequestV1 = ResolveRequestV1(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Resolve extracted metadata against database entities.
    Returns proposals only (no DB writes).
    Supports empty payload for existence/health checks.
    """
    if not req.extraction and not req.contract_id:
        return ResolvedContractProposalV1(needs_review=True)
        
    # Audit logging
    log_ai_request(
        db=db,
        org_id=current_user.organization_id,
        user_id=current_user.id,
        action="contract_resolution",
        message=f"Resolved extraction for: {req.extraction.contract_title if req.extraction else 'Untitled'}",
        tool="contract_resolver",
        parser_version="contract_resolver_v1.2.2"
    )
    
    if req.extraction:
        proposal = resolve_entities(db, current_user.organization_id, req.extraction)
        return proposal
    
    return ResolvedContractProposalV1(needs_review=True)
