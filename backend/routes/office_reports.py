import json
import os
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_active_user, get_current_organization_id
from models.user import User
from models.reporting import ReportDefinition, ReportRun, ReportArtifact
from models.office_document import OfficeDocument, OfficeDocumentLink
from core.audit import log_create, log_update, log_delete, log_download
from services.office_reports import REPORT_TYPES, BUILDERS, export_csv, export_pdf
from config import settings
from schemas.office_reports import (
    ReportDefinition as ReportDefinitionSchema,
    ReportDefinitionCreate,
    ReportDefinitionUpdate,
    ReportRunCreate,
    ReportRun as ReportRunSchema,
    ReportArtifact as ReportArtifactSchema,
)

router = APIRouter()


def _require_viewer(current_user: User = Depends(get_current_active_user)) -> User:
    return current_user


def _require_editor(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role not in ("admin", "staff") and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="reports_editor_required")
    return current_user


def _require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="reports_admin_required")
    return current_user


def _to_definition(defn: ReportDefinition) -> ReportDefinitionSchema:
    return ReportDefinitionSchema(
        id=defn.id,
        organization_id=str(defn.organization_id),
        name=defn.name,
        description=defn.description,
        report_type=defn.report_type,
        config=json.loads(defn.config_json),
        created_by_user_id=defn.created_by_user_id,
        created_at=defn.created_at,
        updated_at=defn.updated_at,
    )


def _to_run(run: ReportRun) -> ReportRunSchema:
    return ReportRunSchema(
        id=run.id,
        organization_id=str(run.organization_id),
        report_definition_id=run.report_definition_id,
        status=run.status,
        requested_by_user_id=run.requested_by_user_id,
        parameters=json.loads(run.parameters_json),
        row_count=run.row_count,
        error=run.error,
        created_at=run.created_at,
        updated_at=run.updated_at,
    )


def _to_artifact(artifact: ReportArtifact) -> ReportArtifactSchema:
    return ReportArtifactSchema(
        id=artifact.id,
        organization_id=str(artifact.organization_id),
        report_run_id=artifact.report_run_id,
        format=artifact.format,
        storage_path=artifact.storage_path,
        filename=artifact.filename,
        mime_type=artifact.mime_type,
        file_size_bytes=artifact.file_size_bytes,
        created_at=artifact.created_at,
    )


@router.get("/office/reports/definitions", response_model=List[ReportDefinitionSchema])
def list_definitions(
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_viewer),
):
    defs = db.query(ReportDefinition).filter(ReportDefinition.organization_id == org_id).all()
    return [_to_definition(d) for d in defs]


@router.post("/office/reports/definitions", response_model=ReportDefinitionSchema, status_code=status.HTTP_201_CREATED)
def create_definition(
    payload: ReportDefinitionCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_editor),
):
    if payload.report_type not in REPORT_TYPES:
        raise HTTPException(status_code=400, detail="invalid_report_type")

    existing = db.query(ReportDefinition).filter(
        ReportDefinition.organization_id == org_id,
        ReportDefinition.name == payload.name,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="report_name_taken")

    defn = ReportDefinition(
        organization_id=org_id,
        name=payload.name,
        description=payload.description,
        report_type=payload.report_type,
        config_json=json.dumps(payload.config),
        created_by_user_id=current_user.id,
    )
    db.add(defn)
    db.commit()
    db.refresh(defn)

    log_create(
        db,
        "report_definition",
        defn.id,
        current_user.id,
        org_id,
        changes={"name": defn.name, "report_type": defn.report_type},
        entity_name=defn.name,
    )

    return _to_definition(defn)


@router.get("/office/reports/definitions/{definition_id}", response_model=ReportDefinitionSchema)
def get_definition(
    definition_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_viewer),
):
    defn = db.query(ReportDefinition).filter(
        ReportDefinition.id == definition_id,
        ReportDefinition.organization_id == org_id,
    ).first()
    if not defn:
        raise HTTPException(status_code=404, detail="Definition not found")
    return _to_definition(defn)


@router.patch("/office/reports/definitions/{definition_id}", response_model=ReportDefinitionSchema)
def update_definition(
    definition_id: int,
    payload: ReportDefinitionUpdate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_editor),
):
    defn = db.query(ReportDefinition).filter(
        ReportDefinition.id == definition_id,
        ReportDefinition.organization_id == org_id,
    ).first()
    if not defn:
        raise HTTPException(status_code=404, detail="Definition not found")

    before = {"name": defn.name, "description": defn.description, "report_type": defn.report_type}
    update_data = payload.model_dump(exclude_unset=True)
    if "report_type" in update_data and update_data["report_type"] not in REPORT_TYPES:
        raise HTTPException(status_code=400, detail="invalid_report_type")
    for field, value in update_data.items():
        if field == "config":
            setattr(defn, "config_json", json.dumps(value))
        else:
            setattr(defn, field, value)
    db.commit()
    db.refresh(defn)

    after = {"name": defn.name, "description": defn.description, "report_type": defn.report_type}
    log_update(
        db,
        "report_definition",
        defn.id,
        current_user.id,
        org_id,
        changes={"before": before, "after": after},
        entity_name=defn.name,
    )

    return _to_definition(defn)


@router.delete("/office/reports/definitions/{definition_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_definition(
    definition_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_admin),
):
    defn = db.query(ReportDefinition).filter(
        ReportDefinition.id == definition_id,
        ReportDefinition.organization_id == org_id,
    ).first()
    if not defn:
        raise HTTPException(status_code=404, detail="Definition not found")

    name = defn.name
    db.delete(defn)
    db.commit()

    log_delete(
        db,
        "report_definition",
        definition_id,
        current_user.id,
        org_id,
        changes={"name": name},
        entity_name=name,
    )

    return None


@router.post("/office/reports/definitions/{definition_id}/run", response_model=ReportRunSchema)
def run_report_by_id(
    definition_id: int,
    parameters: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_editor),
):
    """
    Run a report based on a definition.
    """
    defn = db.query(ReportDefinition).filter(
        ReportDefinition.id == definition_id,
        ReportDefinition.organization_id == org_id
    ).first()
    if not defn:
        raise HTTPException(status_code=404, detail="Definition not found")

    payload = ReportRunCreate(
        report_type=defn.report_type,
        definition_id=definition_id,
        parameters=parameters or json.loads(defn.config_json)
    )
    return run_report(payload, db, org_id, current_user)


def _persist_artifact(org_id: UUID, run_id: int, fmt: str, data: bytes) -> ReportArtifact:
    storage_dir = os.path.join(settings.UPLOAD_DIR, "reports", str(org_id), str(run_id))
    os.makedirs(storage_dir, exist_ok=True)
    filename = f"{uuid4()}.{fmt}"
    dest_path = os.path.join(storage_dir, filename)
    with open(dest_path, "wb") as handle:
        handle.write(data)
    storage_path = dest_path.replace(settings.UPLOAD_DIR, "/uploads")
    mime = "application/pdf" if fmt == "pdf" else "text/csv"
    return ReportArtifact(
        organization_id=org_id,
        report_run_id=run_id,
        format=fmt,
        storage_path=storage_path,
        filename=filename,
        mime_type=mime,
        file_size_bytes=len(data),
    )


@router.post("/office/reports/run", response_model=ReportRunSchema, status_code=status.HTTP_201_CREATED)
def run_report(
    payload: ReportRunCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_editor),
):
    if payload.report_type not in REPORT_TYPES:
        raise HTTPException(status_code=400, detail="invalid_report_type")

    definition_id = payload.definition_id
    if definition_id:
        defn = db.query(ReportDefinition).filter(
            ReportDefinition.id == definition_id,
            ReportDefinition.organization_id == org_id,
        ).first()
        if not defn:
            raise HTTPException(status_code=404, detail="Definition not found")

    run = ReportRun(
        organization_id=org_id,
        report_definition_id=definition_id,
        status="running",
        requested_by_user_id=current_user.id,
        parameters_json=json.dumps(payload.parameters or {}),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    log_create(
        db,
        "report_run",
        run.id,
        current_user.id,
        org_id,
        changes={"report_type": payload.report_type},
        entity_name=f"Report Run {run.id}",
    )

    try:
        builder = BUILDERS[payload.report_type]
        rows, meta = builder(db, org_id, payload.parameters or {})
        run.row_count = len(rows)
        run.status = "done"
        artifacts = []
        formats = REPORT_TYPES[payload.report_type]["formats"]
        if "csv" in formats:
            csv_data = export_csv(rows)
            artifacts.append(_persist_artifact(org_id, run.id, "csv", csv_data))
        if "pdf" in formats:
            pdf_data = export_pdf(meta.get("title", payload.report_type), rows, payload.parameters or {})
            artifacts.append(_persist_artifact(org_id, run.id, "pdf", pdf_data))
        for artifact in artifacts:
            db.add(artifact)
        db.commit()
    except Exception as exc:
        run.status = "failed"
        run.error = str(exc)
        db.commit()
        raise HTTPException(status_code=500, detail="report_run_failed")

    return _to_run(run)


@router.get("/office/reports/runs", response_model=List[ReportRunSchema])
def list_runs(
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_viewer),
):
    runs = db.query(ReportRun).filter(ReportRun.organization_id == org_id).order_by(ReportRun.created_at.desc()).all()
    return [_to_run(run) for run in runs]


@router.get("/office/reports/runs/{run_id}", response_model=ReportRunSchema)
def get_run(
    run_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_viewer),
):
    run = db.query(ReportRun).filter(
        ReportRun.id == run_id,
        ReportRun.organization_id == org_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return _to_run(run)


@router.get("/office/reports/runs/{run_id}/artifacts", response_model=List[ReportArtifactSchema])
def list_run_artifacts(
    run_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_viewer),
):
    artifacts = db.query(ReportArtifact).filter(
        ReportArtifact.report_run_id == run_id,
        ReportArtifact.organization_id == org_id,
    ).all()
    return [_to_artifact(a) for a in artifacts]


def _resolve_artifact_path(artifact: ReportArtifact) -> str:
    return artifact.storage_path.replace("/uploads", settings.UPLOAD_DIR)


@router.get("/office/reports/artifacts/{artifact_id}/download")
def download_artifact(
    artifact_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_viewer),
):
    artifact = db.query(ReportArtifact).filter(
        ReportArtifact.id == artifact_id,
        ReportArtifact.organization_id == org_id,
    ).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    real_path = _resolve_artifact_path(artifact)
    if not os.path.isfile(real_path):
        raise HTTPException(status_code=404, detail="File missing on disk")

    log_download(
        db,
        "report_artifact",
        artifact.id,
        current_user.id,
        org_id,
        changes={"filename": artifact.filename},
        entity_name=artifact.filename,
    )

    return FileResponse(real_path, filename=artifact.filename, media_type=artifact.mime_type)


@router.get("/office/reports/artifacts/{artifact_id}/preview")
def preview_artifact(
    artifact_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_viewer),
):
    artifact = db.query(ReportArtifact).filter(
        ReportArtifact.id == artifact_id,
        ReportArtifact.organization_id == org_id,
    ).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    if artifact.format != "pdf":
        raise HTTPException(status_code=400, detail="preview_not_supported")

    real_path = _resolve_artifact_path(artifact)
    if not os.path.isfile(real_path):
        raise HTTPException(status_code=404, detail="File missing on disk")
    return FileResponse(real_path, filename=artifact.filename, media_type=artifact.mime_type)


@router.get("/office/reports/runs/{run_id}/export.pdf")
def export_run_pdf(
    run_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_viewer),
):
    artifact = db.query(ReportArtifact).filter(
        ReportArtifact.report_run_id == run_id,
        ReportArtifact.format == "pdf",
        ReportArtifact.organization_id == org_id
    ).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="PDF artifact not found")
    
    return preview_artifact(artifact.id, db, org_id, current_user)


@router.post("/office/reports/runs/{run_id}/share")
def share_report(
    run_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_editor),
):
    """
    Share = generate file + store as office document + return doc info.
    We look for the PDF artifact of this run.
    """
    run = db.query(ReportRun).filter(
        ReportRun.id == run_id,
        ReportRun.organization_id == org_id
    ).first()
    if not run or run.status != "done":
        raise HTTPException(status_code=400, detail="run_not_ready_for_sharing")

    artifact = db.query(ReportArtifact).filter(
        ReportArtifact.report_run_id == run_id,
        ReportArtifact.format == "pdf",
        ReportArtifact.organization_id == org_id
    ).first()
    
    if not artifact:
        raise HTTPException(status_code=404, detail="pdf_artifact_not_found")

    # Create an OfficeDocument from the artifact
    # We copy metadata. Note: for V1 we keep the same storage path.
    doc = OfficeDocument(
        organization_id=org_id,
        doc_type="report",
        title=f"Shared Report: {run_id}",
        description=f"Generated from report run {run_id}",
        storage_path=artifact.storage_path,
        storage_filename=artifact.filename,
        original_filename=artifact.filename,
        mime_type=artifact.mime_type,
        file_size_bytes=artifact.file_size_bytes,
        uploaded_by_user_id=current_user.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    log_create(
        db,
        "document",
        doc.id,
        current_user.id,
        org_id,
        changes={"source": "report_share", "run_id": run_id},
        entity_name=doc.title
    )
    
    return {
        "message": "Report shared and stored as document",
        "document_id": doc.id,
        "url": f"/api/office/documents/{doc.id}/download"
    }
