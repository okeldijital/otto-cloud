from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from uuid import uuid4
import os
import shutil
import hashlib
from typing import Dict, Any, List, Optional

from database import get_db
from models.user import User
from models.document import Document
from dependencies import get_current_user
from schemas.ai_contracts_bulk import (
    BulkExtractResponse, BulkExtractResult, 
    ExtractData, JobStatusResponse
)
from services.document_service import create_document
from services.ai.extractors.contract_extractor_v2 import extract_contract_v2_hybrid
from services.ai.parsing.pdf_extract import extract_text_from_pdf
from config import settings
from schemas.ai_contracts_v2 import ContractExtractV2
from schemas.ai_linking import (
    ContractLinkSuggestRequestV1, 
    ContractLinkSuggestResponseV1,
    AIResolutionRequestV1,
    AIResolutionResponseV1
)
from schemas.ai_track_mapping import TrackMapPlanRequest, TrackMapPlanResponse
from schemas.ai_release_integration import ReleaseIntegrationPlanResponse
from services.ai.linking.link_suggest_v1 import suggest_links
from services.ai.resolution.persist import persist_resolution_results
from services.ai.track_mapping.track_map_plan_v1 import build_track_map_plan
from services.ai.release_integration.plan import build_release_integration_plan
from services.ai.extractors.contract_extractor_v1 import extract_contract_intelligence
from services.ai.audit import log_ai_request
from services.ai.parsing.pdf_extract import extract_text_from_pdf
from services.ai.extractors.link_auto_mapper import apply_auto_mapping_to_v2

router = APIRouter()

# In-memory job store for MVP
JOBS: Dict[str, Any] = {}


def ensure_ai_intel_enabled():
    if not settings.AI_ENABLED or not settings.AI_CONTRACT_INTEL_ENABLED:
        raise HTTPException(status_code=404, detail="AI module disabled")


def ensure_ai_resolve_enabled():
    if not settings.AI_ENABLED or not settings.AI_CONTRACT_RESOLVE_ENABLED:
        raise HTTPException(status_code=404, detail="AI module disabled")


def ensure_ai_track_map_enabled():
    if not settings.AI_ENABLED or not getattr(settings, "AI_CONTRACT_TRACK_MAP_ENABLED", True):
        raise HTTPException(status_code=404, detail="AI module disabled")


@router.post("/extract_bulk", response_model=BulkExtractResponse, dependencies=[Depends(ensure_ai_intel_enabled)])
async def extract_bulk(
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Synchronous bulk extraction handling Multipart Upload.
    Persists documents and extracts data.
    """
    org_id = current_user.organization_id
    job_id = f"bulk_{uuid4().hex[:12]}"
    
    results = []
    
    # Store initial job status
    JOBS[job_id] = {
        "status": "running",
        "job_id": job_id,
        "org_id": org_id,
        "progress": {"total": len(files or []), "done": 0, "ok": 0, "error": 0},
        "results": []
    }
    
    if not files:
        raise HTTPException(status_code=400, detail="No files received in request")

    for file in files:
        # We use a temporary ID (0) until persisted, but we will persist.
        # But if persistence fails, we need to report error for this file.
        res = BulkExtractResult(contract_document_id=0, status="pending", filename=file.filename)
        
        try:
            # 1. Save to Disk
            file.file.seek(0)
            original_filename = file.filename
            ext = original_filename.split(".")[-1].lower() if "." in original_filename else "pdf"
            unique_filename = f"{uuid4()}.{ext}"
            saved_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
            
            with open(saved_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            file_size = os.path.getsize(saved_path)
            
            # 2. Create Document Record
            # DB file_path convention: /uploads/unique_filename (based on documents.py)
            db_path = f"/uploads/{unique_filename}" 
            
            doc = create_document(
                db=db,
                filename=unique_filename,
                original_filename=original_filename,
                file_path=db_path,
                file_type=ext,
                mime_type=file.content_type or "application/pdf",
                file_size=file_size,
                organization_id=org_id,
                uploaded_by=current_user.id,
                category="contract",
                title=original_filename
            )
            
            res.contract_document_id = doc.id
            
            # 3. Extract Text from DISK file (or memory)
            # We already saved it. Read back or use memory?
            # File object might be closed? shutil.copyfileobj typically consumes.
            # Read from disk to be safe and consistent.
            with open(saved_path, "rb") as f:
                pdf_bytes = f.read()
                
            text_extract = extract_text_from_pdf(pdf_bytes)
            text = text_extract.get("text", "")
            
            if not text or text.startswith("Error during PDF extraction"):
                 res.status = "error"
                 res.error = {"code": "pdf_parse_failed", "message": text or "Could not extract text from PDF"}
                 results.append(res) # Should we delete document? Maybe keep it as 'failed' record.
                 JOBS[job_id]["results"].append(res.model_dump())
                 JOBS[job_id]["progress"]["done"] += 1
                 JOBS[job_id]["progress"]["error"] += 1
                 continue
            
            # 4. Extract Logic
            extract_result = extract_contract_v2_hybrid(
                text=text,
                filename=original_filename,
                file_sha256=text_extract.get("sha256"),
                page_count=text_extract.get("page_count"),
                settings=settings,
                org_id=org_id,
                user_id=current_user.id
            )
            
            # Convert pydantic model to dict
            extract_data = extract_result.model_dump(mode='json')
            
            # Compatibility injects for legacy consumers
            if "tracks" not in extract_data:
                extract_data["tracks"] = extract_data.get("tracks_mentioned", [])
            if "dates" not in extract_data:
                extract_data["dates"] = {
                    "effective_date": extract_data.get("effective_date"),
                    "start_date": extract_data.get("start_date"),
                    "end_date": extract_data.get("end_date"),
                }
            
            # Auto-map links (Parties and Tracks) if available
            mapping = apply_auto_mapping_to_v2(db, org_id, extract_result)
            extract_data["suggested_party_links"] = mapping.get("party_links", [])
            extract_data["suggested_track_ids"] = mapping.get("track_ids", [])
            extract_data["suggested_track_matches"] = mapping.get("track_matches", [])

            res.status = "ok"
            res.extract = ExtractData(
                version="v2",
                data=extract_data
            )
            
            JOBS[job_id]["progress"]["ok"] += 1

        except Exception as e:
            res.status = "error"
            res.error = {"code": "extraction_exception", "message": str(e)}
            JOBS[job_id]["progress"]["error"] += 1
            
        finally:
            if res not in results:
                results.append(res)
                JOBS[job_id]["results"].append(res.model_dump())
                JOBS[job_id]["progress"]["done"] += 1

    JOBS[job_id]["status"] = "completed"
    
    return BulkExtractResponse(
        status="completed",
        job_id=job_id,
        org_id=org_id,
        results=results
    )

@router.get("/extract_bulk/status/{job_id}", response_model=JobStatusResponse, dependencies=[Depends(ensure_ai_intel_enabled)])
def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if str(job["org_id"]) != str(org_id):
        raise HTTPException(status_code=404, detail="Job not found (access denied)")
        
    return JobStatusResponse(**job)

@router.post("/extract", dependencies=[Depends(ensure_ai_intel_enabled)])
async def extract_contract_single(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Restored Single File Extract for backward compatibility / other UI parts.
    """
    org_id = current_user.organization_id
    # Read Bytes
    pdf_bytes = await file.read()
    
    # Extract Text
    text_extract = extract_text_from_pdf(pdf_bytes)
    text = text_extract.get("text", "")
    
    if text.startswith("Error during PDF extraction"):
         raise HTTPException(status_code=422, detail="pdf_parse_failed")

    # Extra check for genuinely empty content if needed, but allow 200 for blank sheets
    # as some tests expect 200 for valid (but empty) PDFs.

    # Extract Logic
    try:
        # Perform both V1 and V2 extraction to satisfy all test suites (V1 legacy and V2 modern)
        v1_result = extract_contract_intelligence(text, filename=file.filename)
        
        extract_result_v2 = extract_contract_v2_hybrid(
            text=text,
            filename=file.filename,
            file_sha256=text_extract.get("sha256", "unknown"),
            page_count=text_extract.get("page_count", 0),
            settings=settings,
            org_id=current_user.organization_id,
            user_id=current_user.id
        )
        
        # Base response is V1 for backward compatibility
        response_data = v1_result.model_dump(mode='json')
        
        # Add V2 payload for modern tests
        v2_data = extract_result_v2.model_dump(mode='json')
        # Compatibility injects for V2 nested data
        v2_data["tracks"] = v2_data.get("tracks_mentioned", [])
        v2_data["dates"] = {
            "effective_date": v2_data.get("effective_date"),
            "start_date": v2_data.get("start_date"),
            "end_date": v2_data.get("end_date"),
            "end_date_specified": v2_data.get("end_date") is not None
        }
        
        # Auto-map links (Parties and Tracks)
        mapping = apply_auto_mapping_to_v2(db, org_id, extract_result_v2)
        v2_data["suggested_party_links"] = mapping.get("party_links", [])
        v2_data["suggested_track_ids"] = mapping.get("track_ids", [])
        v2_data["suggested_track_matches"] = mapping.get("track_matches", [])
        
        response_data["version"] = "v2"
        response_data["data"] = v2_data
        
        return response_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/link_suggest", response_model=ContractLinkSuggestResponseV1, dependencies=[Depends(ensure_ai_intel_enabled)])
async def link_suggest(
    req: ContractLinkSuggestRequestV1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Suggest links for a given extraction.
    """
    org_id = current_user.organization_id
    log_ai_request(
        db=db,
        org_id=org_id,
        user_id=current_user.id,
        action="contract_link_suggest",
        message=f"contract_title={req.extraction.contract_title or 'unknown'}",
        tool="link_suggest",
        parser_version=req.extraction.parser_version,
        linker_version="link_suggest_v1.0.0"
    )
    return suggest_links(db, str(org_id), req.extraction)


@router.post("/resolve", response_model=AIResolutionResponseV1, dependencies=[Depends(ensure_ai_resolve_enabled)])
async def resolve(
    req: AIResolutionRequestV1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Persist resolution decisions.
    """
    org_id = current_user.organization_id
    run_id = persist_resolution_results(db, org_id, current_user.id, req)
    log_ai_request(
        db=db,
        org_id=org_id,
        user_id=current_user.id,
        action="resolve",
        message=f"run_id={run_id}|hash={req.contract_hash}",
        tool="resolve",
        parser_version=req.extractor_version,
        linker_version=req.linker_version
    )
    return AIResolutionResponseV1(run_id=run_id)


@router.post("/intake/wizard_plan", response_model=ReleaseIntegrationPlanResponse, dependencies=[Depends(ensure_ai_intel_enabled)])
async def intake_wizard_plan(
    release_id: int = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Combined extract + link suggestion plan for the intake wizard.
    Used by the frontend to show matches before persisting anything.
    """
    org_id = current_user.organization_id
    contract_extract = None
    
    if file:
        pdf_bytes = await file.read()
        text_extract = extract_text_from_pdf(pdf_bytes)
        text = text_extract.get("text", "")
        if text:
            # We use V1 extractor as expected by the build_release_integration_plan
            contract_extract = extract_contract_intelligence(text)

    try:
        return build_release_integration_plan(
            db=db,
            org_id=org_id,
            release_id=release_id,
            contract_extract=contract_extract
        )
    except ValueError as exc:
        if str(exc) == "release_not_found":
            raise HTTPException(status_code=404, detail="Not Found")
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/track_map_plan", response_model=TrackMapPlanResponse, dependencies=[Depends(ensure_ai_track_map_enabled)])
async def track_map_plan(
    req: TrackMapPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a mapping plan for tracks in a contract.
    """
    try:
        return build_track_map_plan(db, current_user.organization_id, req)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
