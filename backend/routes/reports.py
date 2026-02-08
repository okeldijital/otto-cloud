from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import List, Optional, Any
from uuid import UUID
from datetime import datetime, timedelta
import csv
import io
from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from database import get_db
from dependencies import get_current_active_user, get_current_organization_id
from models.user import User
from models.artist import Artist
from models.release import Release
from models.work import Work
from models.task import Task
from models.event import Event
from models.contract import Contract, ContractAsset
from models.office_document import OfficeDocument, OfficeDocumentLink

router = APIRouter()

def _require_office_user(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role not in ("admin", "staff") and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="office_access_required")
    return current_user

# --- Helper Functions ---

def generate_csv_response(filename: str, headers: List[str], data: List[List[Any]]) -> Response:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(data)
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
    )

def generate_excel_response(filename: str, sheet_name: str, headers: List[str], data: List[List[Any]]) -> Response:
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name
    ws.append(headers)
    for row in data:
        ws.append(row)
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"}
    )

def generate_pdf_response(filename: str, title: str, headers: List[str], data: List[List[Any]]) -> Response:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    elements.append(Paragraph(title, styles['Title']))
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    elements.append(Spacer(1, 12))
    
    # Table data includes headers
    table_data = [headers] + data
    t = Table(table_data)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(t)
    
    doc.build(elements)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}.pdf"}
    )

# --- Report Endpoints ---

@router.get("/office/reports/documents-status")
def report_documents_status(
    format: str = "pdf",
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user)
):
    """
    Documents Status Report:
    - Missing registrations
    - Expired contracts
    """
    # 1. Expired Contracts
    expired_contracts = db.query(Contract).filter(
        Contract.organization_id == org_id,
        Contract.status == "Active",
        Contract.end_date < datetime.now().date()
    ).all()
    
    # 2. Missing Registration Proof (Works)
    works_indexed = db.query(Work).filter(Work.organization_id == org_id).all()
    missing_regs = []
    for w in works_indexed:
        has_reg = db.query(OfficeDocumentLink).join(OfficeDocument).filter(
            OfficeDocumentLink.entity_type == "work",
            OfficeDocumentLink.entity_id == w.id,
            OfficeDocument.doc_type == "registration_proof",
            OfficeDocument.organization_id == org_id
        ).first()
        if not has_reg:
            missing_regs.append(w)

    data = []
    headers = ["Category", "Entity", "Issue", "Details"]
    
    for c in expired_contracts:
        data.append(["Contract", c.title, "EXPIRED", f"End Date: {c.end_date}"])
    
    for w in missing_regs:
        data.append(["Work", w.title, "MISSING REG", "No registration proof uploaded"])
        
    filename = f"documents_status_{datetime.now().strftime('%Y%m%d')}"
    title = "Documents Status & Compliance Report"
    
    if format == "csv":
        return generate_csv_response(filename, headers, data)
    elif format == "xlsx":
        return generate_excel_response(filename, "DocStatus", headers, data)
    return generate_pdf_response(filename, title, headers, data)


@router.get("/office/reports/tasks-summary")
def report_tasks_summary(
    format: str = "pdf",
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user)
):
    """
    Tasks Report:
    - Overdue
    - Blocked
    """
    tasks = db.query(Task).filter(
        Task.organization_id == org_id,
        Task.is_deleted == False
    ).all()
    
    data = []
    headers = ["Task Title", "Status", "Priority", "Due Date", "Issue"]
    
    now = datetime.now()
    for t in tasks:
        issue = ""
        if t.status == "blocked":
            issue = "BLOCKED"
        elif t.due_date and t.due_date < now and t.status != "done":
            issue = "OVERDUE"
            
        if issue:
            data.append([
                t.title,
                t.status,
                t.priority,
                t.due_date.strftime('%Y-%m-%d %H:%M') if t.due_date else "---",
                issue
            ])
            
    filename = f"tasks_summary_{datetime.now().strftime('%Y%m%d')}"
    title = "Tasks Exception & Summary Report"
    
    if format == "csv":
        return generate_csv_response(filename, headers, data)
    elif format == "xlsx":
        return generate_excel_response(filename, "Tasks", headers, data)
    return generate_pdf_response(filename, title, headers, data)


@router.get("/office/reports/events-timeline")
def report_events_timeline(
    days: int = 30,
    format: str = "pdf",
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user)
):
    """
    Events Timeline:
    - Upcoming releases/deadlines
    """
    end_date = datetime.now() + timedelta(days=days)
    events = db.query(Event).filter(
        Event.organization_id == org_id,
        Event.is_deleted == False,
        Event.start_datetime >= datetime.now(),
        Event.start_datetime <= end_date
    ).order_by(Event.start_datetime.asc()).all()
    
    data = []
    headers = ["Date", "Event Title", "Type", "Status", "Location"]
    
    for e in events:
        data.append([
            e.start_datetime.strftime('%Y-%m-%d %H:%M') if e.start_datetime else "---",
            e.title,
            e.event_type,
            e.status,
            e.location or "---"
        ])
        
    filename = f"events_timeline_{datetime.now().strftime('%Y%m%d')}"
    title = f"Upcoming Events Timeline (Next {days} Days)"
    
    if format == "csv":
        return generate_csv_response(filename, headers, data)
    elif format == "xlsx":
        return generate_excel_response(filename, "Timeline", headers, data)
    return generate_pdf_response(filename, title, headers, data)


@router.get("/office/reports/status-quo")
def report_status_quo(
    format: str = "pdf",
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user)
):
    """
    Status Quo Report (Deterministic Logic):
    - Contract signed but work not registered
    - Work registered but no contract
    """
    # 1. Contract signed but work not registered
    signed_contracts = db.query(Contract).filter(
        Contract.organization_id == org_id,
        Contract.status == "Active"
    ).all()
    
    issues = []
    for c in signed_contracts:
        # Check assets of type 'work'
        assets = db.query(ContractAsset).filter(
            ContractAsset.contract_id == c.id,
            ContractAsset.asset_type == "work"
        ).all()
        
        for asset in assets:
            work = db.query(Work).filter(Work.id == asset.asset_id).first()
            if work and not work.iswc_code:
                issues.append(["Work missing ISWC", f"Work: {work.title}", f"Contract: {c.title}"])
                
    # 2. Work registered but no contract
    registered_works = db.query(Work).filter(
        Work.organization_id == org_id,
        Work.iswc_code != None
    ).all()
    
    for w in registered_works:
        has_contract = db.query(ContractAsset).filter(
            ContractAsset.asset_type == "work",
            ContractAsset.asset_id == w.id
        ).first()
        if not has_contract:
            issues.append(["Work missing Contract", f"Work: {w.title}", "No linked contract asset"])

    headers = ["Issue Type", "Primary Entity", "Context/Reference"]
    filename = f"status_quo_{datetime.now().strftime('%Y%m%d')}"
    title = "Status Quo Analysis Report"
    
    if format == "csv":
        return generate_csv_response(filename, headers, issues)
    elif format == "xlsx":
        return generate_excel_response(filename, "StatusQuo", headers, issues)
    return generate_pdf_response(filename, title, headers, issues)


from models.audit_log import AuditLog

@router.get("/office/reports/audit-trail")
def report_audit_trail(
    days: int = 7,
    format: str = "pdf",
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user)
):
    """
    Audit Trail Report:
    - Recent activities across all modules
    """
    start_date = datetime.now() - timedelta(days=days)
    logs = db.query(AuditLog).filter(
        AuditLog.organization_id == org_id,
        AuditLog.created_at >= start_date
    ).order_by(AuditLog.created_at.desc()).all()
    
    data = []
    headers = ["Date", "User", "Action", "Entity", "Name"]
    
    for log in logs:
        # Get user email
        user_email = "Unknown"
        if log.user:
            user_email = log.user.email
            
        data.append([
            log.created_at.strftime('%Y-%m-%d %H:%M'),
            user_email,
            log.action,
            log.entity_type,
            log.entity_name or "---"
        ])
        
    filename = f"audit_trail_{datetime.now().strftime('%Y%m%d')}"
    title = f"Operational Audit Trail (Last {days} Days)"
    
    if format == "csv":
        return generate_csv_response(filename, headers, data)
    elif format == "xlsx":
        return generate_excel_response(filename, "AuditTrail", headers, data)
    return generate_pdf_response(filename, title, headers, data)


# --- Legacy/Standard Exports (Updated for Scoping) ---

@router.get("/export/artists")
def export_artists(
    format: str = "xlsx",
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user)
):
    artists = db.query(Artist).filter(Artist.organization_id == org_id, Artist.is_deleted == False).all()
    headers = ["ID", "Name", "Artist ID", "IPI", "Email"]
    data = [[a.id, a.name, a.artist_id, a.ipi_number, a.contact_email] for a in artists]
    
    filename = f"artists_export_{datetime.now().strftime('%Y%m%d')}"
    if format.lower() == "csv":
        return generate_csv_response(filename, headers, data)
    return generate_excel_response(filename, "Artists", headers, data)

@router.get("/export/releases")
def export_releases(
    format: str = "xlsx",
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user)
):
    releases = db.query(Release).filter(Release.organization_id == org_id, Release.is_deleted == False).all()
    headers = ["ID", "Title", "Release ID", "UPC", "Date"]
    data = [[r.id, r.title, r.release_id, r.upc_code, str(r.release_date)] for r in releases]
    
    filename = f"releases_export_{datetime.now().strftime('%Y%m%d')}"
    if format.lower() == "csv":
        return generate_csv_response(filename, headers, data)
    return generate_excel_response(filename, "Releases", headers, data)

@router.get("/export/works")
def export_works(
    format: str = "xlsx",
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user)
):
    works = db.query(Work).filter(Work.organization_id == org_id, Work.is_deleted == False).all()
    headers = ["ID", "Title", "Work ID", "ISWC"]
    data = [[w.id, w.title, w.work_id, w.iswc_code] for w in works]
    
    filename = f"works_export_{datetime.now().strftime('%Y%m%d')}"
    if format.lower() == "csv":
        return generate_csv_response(filename, headers, data)
    return generate_excel_response(filename, "Works", headers, data)

@router.get("/export/tasks")
def export_tasks(
    format: str = "xlsx",
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user)
):
    tasks = db.query(Task).filter(Task.organization_id == org_id, Task.is_deleted == False).all()
    headers = ["ID", "Title", "Status", "Priority", "Due Date"]
    data = [[t.id, t.title, t.status, t.priority, str(t.due_date)] for t in tasks]
    
    filename = f"tasks_export_{datetime.now().strftime('%Y%m%d')}"
    if format.lower() == "csv":
        return generate_csv_response(filename, headers, data)
    return generate_excel_response(filename, "Tasks", headers, data)

@router.get("/export/events")
def export_events(
    format: str = "xlsx",
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user)
):
    events = db.query(Event).filter(Event.organization_id == org_id, Event.is_deleted == False).all()
    headers = ["ID", "Title", "Type", "Status", "Start"]
    data = [[e.id, e.title, e.event_type, e.status, str(e.start_datetime)] for e in events]
    
    filename = f"events_export_{datetime.now().strftime('%Y%m%d')}"
    if format.lower() == "csv":
        return generate_csv_response(filename, headers, data)
@router.get("/export/{entity}/{entity_id}")
def export_single_entity(
    entity: str,
    entity_id: int,
    format: str = "xlsx",
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user)
):
    """
    Export single entity metadata (Release, Work, etc.)
    """
    filename = f"{entity}_{entity_id}_export_{datetime.now().strftime('%Y%m%d')}"
    headers = []
    data = []

    if entity == "release":
        release = db.query(Release).filter(Release.id == entity_id, Release.organization_id == org_id).first()
        if not release:
            raise HTTPException(status_code=404, detail="Release not found")
        
        headers = ["Field", "Value"]
        data = [
            ["ID", release.id],
            ["Title", release.title],
            ["Catalog Number", release.catalog_number],
            ["UPC", release.upc_code],
            ["Release Date", str(release.release_date)],
            ["Type", release.release_type],
            ["Label ID", release.label_id],
            ["Distributor ID", release.distributor_id],
            ["Artist IDs", str(release.artist_ids)],
            ["Created At", str(release.created_at)],
            ["Updated At", str(release.updated_at)],
        ]
        
        # Add Tracks?
        # Maybe separate sheet or section? For now, flat list of metadata.
        
    elif entity == "work":
        work = db.query(Work).filter(Work.id == entity_id, Work.organization_id == org_id).first()
        if not work:
            raise HTTPException(status_code=404, detail="Work not found")
            
        headers = ["Field", "Value"]
        data = [
            ["ID", work.id],
            ["Title", work.title],
            ["ISWC", work.iswc_code],
            ["Work ID", work.work_id],
            ["Writers", str(work.writers)],
            ["Created At", str(work.created_at)]
        ]
        
    else:
        raise HTTPException(status_code=400, detail=f"Entity type '{entity}' not supported for single export")

    if format.lower() == "csv":
        return generate_csv_response(filename, headers, data)
    return generate_excel_response(filename, f"{entity.capitalize()}Details", headers, data)
