from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
import csv
import io
from openpyxl import Workbook
from datetime import datetime

from database import get_db
from models.user import User
from models.artist import Artist
from models.release import Release
from models.work import Work
from models.task import Task
from models.event import Event
from dependencies import get_current_active_user

router = APIRouter()

def generate_csv(data, fieldnames):
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(data)
    return output.getvalue()

def generate_excel(data, fieldnames, title):
    wb = Workbook()
    ws = wb.active
    ws.title = title
    
    # Write header
    for col, field in enumerate(fieldnames, 1):
        ws.cell(row=1, column=col, value=field)
    
    # Write data
    for row_idx, item in enumerate(data, 2):
        for col_idx, field in enumerate(fieldnames, 1):
            ws.cell(row=row_idx, column=col_idx, value=str(item.get(field, "")))
    
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()

@router.get("/export/artists")
def export_artists(
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    artists = db.query(Artist).all()
    data = []
    for a in artists:
        data.append({
            "ID": a.id,
            "Name": a.name,
            "Type": a.artist_type,
            "Genre": a.genre,
            "Email": a.contact_email,
            "Website": a.website,
            "Created At": a.created_at.strftime("%Y-%m-%d") if a.created_at else ""
        })
    
    fieldnames = ["ID", "Name", "Type", "Genre", "Email", "Website", "Created At"]
    filename = f"artists_export_{datetime.now().strftime('%Y%m%d')}"
    
    if format.lower() == "excel":
        content = generate_excel(data, fieldnames, "Artists")
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"}
        )
    else:
        content = generate_csv(data, fieldnames)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
        )

@router.get("/export/releases")
def export_releases(
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    releases = db.query(Release).all()
    data = []
    for r in releases:
        data.append({
            "ID": r.id,
            "Title": r.title,
            "UPC": r.upc_code,
            "Release Date": r.release_date.strftime("%Y-%m-%d") if r.release_date else "",
            "Type": r.release_type,
            "Label": r.label.name if r.label else "N/A",
            "Artist": r.artist.name if r.artist else "N/A"
        })
    
    fieldnames = ["ID", "Title", "UPC", "Release Date", "Type", "Label", "Artist"]
    filename = f"releases_export_{datetime.now().strftime('%Y%m%d')}"
    
    if format.lower() == "excel":
        content = generate_excel(data, fieldnames, "Releases")
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"}
        )
    else:
        content = generate_csv(data, fieldnames)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
        )

@router.get("/export/works")
def export_works(
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    works = db.query(Work).all()
    data = []
    for w in works:
        data.append({
            "ID": w.id,
            "Title": w.title,
            "ISWC": w.work_id,
            "Publisher": w.publisher.name if w.publisher else "N/A",
            "PRO": w.pro.name if w.pro else "N/A"
        })
    
    fieldnames = ["ID", "Title", "ISWC", "Publisher", "PRO"]
    filename = f"works_export_{datetime.now().strftime('%Y%m%d')}"
    
    if format.lower() == "excel":
        content = generate_excel(data, fieldnames, "Works")
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"}
        )
    else:
        content = generate_csv(data, fieldnames)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
        )

@router.get("/export/tasks")
def export_tasks(
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    tasks = db.query(Task).all()
    data = []
    for t in tasks:
        data.append({
            "ID": t.id,
            "Title": t.title,
            "Status": t.status,
            "Priority": t.priority,
            "Due Date": t.due_date.strftime("%Y-%m-%d") if t.due_date else "",
            "Assigned To": t.assigned_to.email if t.assigned_to else "Unassigned"
        })
    
    fieldnames = ["ID", "Title", "Status", "Priority", "Due Date", "Assigned To"]
    filename = f"tasks_export_{datetime.now().strftime('%Y%m%d')}"
    
    if format.lower() == "excel":
        content = generate_excel(data, fieldnames, "Tasks")
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"}
        )
    else:
        content = generate_csv(data, fieldnames)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
        )

@router.get("/export/events")
def export_events(
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    events = db.query(Event).all()
    data = []
    for e in events:
        data.append({
            "ID": e.id,
            "Title": e.title,
            "Start": e.start_datetime.strftime("%Y-%m-%d %H:%M") if e.start_datetime else "",
            "End": e.end_datetime.strftime("%Y-%m-%d %H:%M") if e.end_datetime else "",
            "Category": e.category,
            "Location": e.location
        })
    
    fieldnames = ["ID", "Title", "Start", "End", "Category", "Location"]
    filename = f"events_export_{datetime.now().strftime('%Y%m%d')}"
    
    if format.lower() == "excel":
        content = generate_excel(data, fieldnames, "Events")
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"}
        )
    else:
        content = generate_csv(data, fieldnames)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
        )
