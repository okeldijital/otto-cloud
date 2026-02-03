from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from uuid import UUID
from datetime import datetime, timedelta
import json

from models.governance import StatusQuoItem
from models.contract import Contract, ContractAsset
from models.work import Work
from models.release import Release
from models.artist import Artist
from models.office_document import OfficeDocument, OfficeDocumentLink
from models.task import Task
from models.user import User

def recompute_status_quo(db: Session, org_id: UUID, user_id: int):
    """
    Deterministic engine to compute governance gaps.
    """
    # 1. Fetch current open (unresolved) items to mark them as 'stale' if not found in this run
    # Actually, V1 simplified: we clear unresolved and re-insert, or upsert.
    # Upsert is better for task stability.
    
    current_unresolved = db.query(StatusQuoItem).filter(
        StatusQuoItem.organization_id == org_id,
        StatusQuoItem.resolved_at == None
    ).all()
    unresolved_map = {(i.entity_type, i.entity_id, i.issue_type): i for i in current_unresolved}
    found_keys = set()
    
    def report_issue(entity_type, entity_id, issue_type, severity, summary, details=None):
        key = (entity_type, entity_id, issue_type)
        found_keys.add(key)
        
        if key in unresolved_map:
            # Already exists, maybe update summary/details if changed
            item = unresolved_map[key]
            item.summary = summary
            item.details_json = json.dumps(details) if details else None
            return item
        else:
            # New issue
            new_item = StatusQuoItem(
                organization_id=org_id,
                entity_type=entity_type,
                entity_id=entity_id,
                issue_type=issue_type,
                severity=severity,
                summary=summary,
                details_json=json.dumps(details) if details else None
            )
            db.add(new_item)
            db.flush() # Get ID
            # Sync to Task
            sync_item_to_task(db, new_item, user_id)
            return new_item

    # --- Rule 1: CONTRACT_SIGNED_WORK_NOT_REGISTERED ---
    # Contract exists (Active) + has linked assets (Work) + missing "registration_proof" doc for that work.
    active_contracts = db.query(Contract).filter(
        Contract.organization_id == org_id,
        Contract.status == "Active"
    ).all()
    
    for contract in active_contracts:
        # Linked works
        assets = db.query(ContractAsset).filter(
            ContractAsset.contract_id == contract.id,
            ContractAsset.asset_type.ilike("work")
        ).all()
        
        for asset in assets:
            work_id = asset.asset_id
            # Check for registration_proof document linked to this work
            proof_exists = db.query(OfficeDocumentLink).join(OfficeDocument).filter(
                OfficeDocumentLink.entity_type == "work",
                OfficeDocumentLink.entity_id == work_id,
                OfficeDocument.doc_type == "registration_proof",
                OfficeDocument.organization_id == org_id
            ).first()
            
            if not proof_exists:
                work = db.query(Work).filter(Work.id == work_id).first()
                work_title = work.title if work else f"Work #{work_id}"
                report_issue(
                    "work", work_id, "CONTRACT_SIGNED_WORK_NOT_REGISTERED", "critical",
                    f"Work '{work_title}' is under active contract '{contract.title}' but missing registration proof.",
                    {"contract_id": str(contract.id), "contract_title": contract.title}
                )

    # --- Rule 2: WORK_REGISTERED_NO_CONTRACT ---
    # Work has registration proof doc but no linked contract asset.
    registered_works = db.query(OfficeDocumentLink).join(OfficeDocument).filter(
        OfficeDocument.doc_type == "registration_proof",
        OfficeDocument.organization_id == org_id,
        OfficeDocumentLink.entity_type == "work"
    ).all()
    
    for link in registered_works:
        work_id = link.entity_id
        contract_link = db.query(ContractAsset).filter(
            ContractAsset.asset_type.ilike("work"),
            ContractAsset.asset_id == work_id,
            ContractAsset.organization_id == org_id
        ).first()
        
        if not contract_link:
            work = db.query(Work).filter(Work.id == work_id).first()
            work_title = work.title if work else f"Work #{work_id}"
            report_issue(
                "work", work_id, "WORK_REGISTERED_NO_CONTRACT", "warn",
                f"Work '{work_title}' has registration proof uploaded but is not linked to any contract.",
                {"doc_id": link.document_id}
            )

    # --- Rule 3: MISSING_REQUIRED_DOCUMENT (Simplified V1 Matrix) ---
    # Artist needs "ID Proof" (doc_type='other' or we could add 'identity')
    # Use 'other' for now if not defined, or check title. 
    # Let's say: Artist needs at least ONE document.
    artists = db.query(Artist).filter(Artist.organization_id == org_id, Artist.is_deleted == False).all()
    for artist in artists:
        doc_count = db.query(OfficeDocumentLink).filter(
            OfficeDocumentLink.entity_type == "artist",
            OfficeDocumentLink.entity_id == artist.id
        ).count()
        if doc_count == 0:
            report_issue(
                "artist", artist.id, "MISSING_REQUIRED_DOCUMENT", "info",
                f"Artist '{artist.name}' has no onboarded documents.",
                {"required": "any_doc"}
            )

    # --- Rule 4: PUBLISHER_OR_PRO_MISSING ---
    # Work has no composer/publisher relationships (missing metadata)
    # Checking works for missing ISWC as a proxy for V1 completeness if needed, 
    # but prompt specifically says publisher/PRO missing.
    works = db.query(Work).filter(Work.organization_id == org_id, Work.is_deleted == False).all()
    for work in works:
        # Check if work has no PRO code (ISWC) or if we had a more specific junction table (not in current model view)
        # Based on models/work.py (implied): if iswc_code is null
        if not work.iswc_code:
            report_issue(
                "work", work.id, "PUBLISHER_OR_PRO_MISSING", "critical",
                f"Work '{work.title}' is missing ISWC or PRO assignment.",
                None
            )

    # --- Finalize: Resolve items no longer found ---
    for key, item in unresolved_map.items():
        if key not in found_keys:
            resolve_status_quo_item(db, item, user_id, "Auto-resolved by recompute.")
    
    db.commit()
    return len(found_keys)

def resolve_status_quo_item(db: Session, item: StatusQuoItem, user_id: int, note: str = None):
    item.resolved_at = datetime.utcnow()
    item.resolved_by_user_id = user_id
    if note:
        details = json.loads(item.details_json) if item.details_json else {}
        details["resolution_note"] = note
        item.details_json = json.dumps(details)
    
    # Sync to Task
    task = db.query(Task).filter(
        Task.organization_id == item.organization_id,
        Task.source_type == "STATUS_QUO",
        Task.source_id == item.id
    ).first()
    if task:
        task.status = "done"
    
    db.flush()

def sync_item_to_task(db: Session, item: StatusQuoItem, user_id: int):
    """
    Creates or updates a Task from a StatusQuoItem.
    Task title: "[Status Quo] <issue_type>: <entity_type>#<id>"
    """
    title = f"[Status Quo] {item.issue_type}: {item.entity_type}#{item.entity_id}"
    
    # Check for existing task
    task = db.query(Task).filter(
        Task.organization_id == item.organization_id,
        Task.source_type == "STATUS_QUO",
        Task.source_id == item.id
    ).first()
    
    if not task:
        # Create new task
        new_task = Task(
            organization_id=item.organization_id,
            title=title,
            description=item.summary,
            status="todo" if item.resolved_at is None else "done",
            priority=item.severity if item.severity in ["low", "medium", "high"] else "medium", # map critical to high?
            created_by_user_id=user_id,
            source_type="STATUS_QUO",
            source_id=item.id,
            linked_entity_type=item.entity_type,
            linked_entity_id=item.entity_id
        )
        if item.severity == "critical":
            new_task.priority = "high"
        db.add(new_task)
    else:
        # Update existing
        task.title = title
        task.description = item.summary
        task.status = "todo" if item.resolved_at is None else "done"
        if item.severity == "critical":
            task.priority = "high"
        elif item.severity in ["low", "medium", "high"]:
            task.priority = item.severity
