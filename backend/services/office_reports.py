import csv
import json
import os
from io import StringIO
from typing import Dict, Any, List, Tuple
from uuid import UUID
from datetime import datetime, timedelta

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from config import settings
from models.artist import Artist
from models.track import Track
from models.release import Release
from models.work import Work
from models.contract import Contract, ContractParty, ContractAsset
from models.works_admin import WorksAdmin
from models.royalty import Royalty
from models.network import Organization

from models.governance import StatusQuoItem
from models.office_document import OfficeDocument, OfficeDocumentLink
from models.task import Task
from models.event import Event

REPORT_TYPES = {
    "status_quo": {"label": "Status Quo Report", "formats": ["pdf", "csv"]},
    "documents_coverage": {"label": "Documents Coverage", "formats": ["pdf", "csv"]},
    "tasks_progress": {"label": "Tasks Progress", "formats": ["pdf", "csv"]},
    "events_timeline": {"label": "Events Timeline", "formats": ["pdf", "csv"]},
}

def build_status_quo(db, org_id: UUID, params: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    items = db.query(StatusQuoItem).filter(
        StatusQuoItem.organization_id == org_id,
        StatusQuoItem.resolved_at == None
    ).all()
    rows = []
    for i in items:
        rows.append({
            "Severity": i.severity,
            "Issue": i.issue_type,
            "Entity": f"{i.entity_type}#{i.entity_id}",
            "Summary": i.summary,
            "Created": i.created_at.strftime("%Y-%m-%d")
        })
    return rows, {"title": "Governance Status Quo Analysis"}

def build_documents_coverage(db, org_id: UUID, params: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    # Coverage by entity type. Check Artists and Releases for V1.
    rows = []
    artists = db.query(Artist).filter(Artist.organization_id == org_id, Artist.is_deleted == False).all()
    for a in artists:
        count = db.query(OfficeDocumentLink).filter(
            OfficeDocumentLink.entity_type == "artist",
            OfficeDocumentLink.entity_id == a.id
        ).count()
        rows.append({"Type": "Artist", "Name": a.name, "Docs": count, "Status": "OK" if count > 0 else "MISSING"})
    
    releases = db.query(Release).filter(Release.organization_id == org_id, Release.is_deleted == False).all()
    for r in releases:
        count = db.query(OfficeDocumentLink).filter(
            OfficeDocumentLink.entity_type == "release",
            OfficeDocumentLink.entity_id == r.id
        ).count()
        rows.append({"Type": "Release", "Name": r.title, "Docs": count, "Status": "OK" if count > 0 else "MISSING"})
        
    return rows, {"title": "Documents Coverage Report"}

def build_tasks_progress(db, org_id: UUID, params: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    tasks = db.query(Task).filter(Task.organization_id == org_id, Task.is_deleted == False).all()
    rows = []
    for t in tasks:
        rows.append({
            "Status": t.status,
            "Priority": t.priority,
            "Title": t.title,
            "Due": t.due_date.strftime("%Y-%m-%d") if t.due_date else "---",
            "Source": t.source_type or "Manual"
        })
    return rows, {"title": "Tasks Progress & Status Overview"}

def build_events_timeline(db, org_id: UUID, params: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    # Events in next 30 days
    now = datetime.utcnow()
    future = now + timedelta(days=30)
    events = db.query(Event).filter(
        Event.organization_id == org_id,
        Event.start_datetime >= now,
        Event.start_datetime <= future
    ).order_by(Event.start_datetime).all()
    rows = []
    for e in events:
        rows.append({
            "Date": e.start_datetime.strftime("%Y-%m-%d %H:%M"),
            "Event": e.title,
            "Type": e.event_type,
            "Status": e.status
        })
    return rows, {"title": "Upcoming Events Timeline (30 Days)"}

BUILDERS = {
    "status_quo": build_status_quo,
    "documents_coverage": build_documents_coverage,
    "tasks_progress": build_tasks_progress,
    "events_timeline": build_events_timeline,
}


def export_csv(rows: List[Dict[str, Any]]) -> bytes:
    output = StringIO()
    if not rows:
        output.write("")
        return output.getvalue().encode("utf-8")
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue().encode("utf-8")


def export_pdf(title: str, rows: List[Dict[str, Any]], params: Dict[str, Any]) -> bytes:
    buffer_path = os.path.join(settings.UPLOAD_DIR, "tmp_report.pdf")
    c = canvas.Canvas(buffer_path, pagesize=letter)
    width, height = letter
    y = height - 40
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, y, title)
    y -= 20
    c.setFont("Helvetica", 9)
    c.drawString(40, y, f"Filters: {json.dumps(params)}")
    y -= 20
    c.setFont("Helvetica", 8)
    for row in rows:
        line = " | ".join([f"{k}: {v}" for k, v in row.items()])
        if y < 60:
            c.showPage()
            y = height - 40
            c.setFont("Helvetica", 8)
        c.drawString(40, y, line[:120])
        y -= 12
    c.setFont("Helvetica", 8)
    c.drawString(40, 30, "Generated by OTTO")
    c.save()
    with open(buffer_path, "rb") as handle:
        data = handle.read()
    os.remove(buffer_path)
    return data
