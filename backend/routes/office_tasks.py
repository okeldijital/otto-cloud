from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from database import get_db
from dependencies import get_current_active_user, get_current_organization_id
from models.user import User
from models.task import Task
from core.audit import log_create, log_delete, log_update
from schemas.office_tasks import OfficeTask, OfficeTaskCreate, OfficeTaskUpdate

router = APIRouter()

STATUSES = ["todo", "in_progress", "blocked", "done"]
PRIORITIES = ["low", "medium", "high"]


def _require_office_user(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role not in ("admin", "staff") and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Office access requires admin or staff role")
    return current_user


def _to_office_task(task: Task) -> OfficeTask:
    return OfficeTask(
        id=task.id,
        organization_id=str(task.organization_id),
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        due_date=task.due_date,
        assigned_to_user_id=task.assigned_to_user_id,
        linked_entity_type=task.linked_entity_type,
        linked_entity_id=task.linked_entity_id,
        created_by_user_id=task.created_by_user_id,
        created_at=task.created_at,
        updated_at=task.updated_at,
        is_deleted=task.is_deleted,
    )


@router.get("/office/tasks", response_model=List[OfficeTask])
def list_office_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to_user_id: Optional[int] = None,
    due_before: Optional[datetime] = None,
    due_after: Optional[datetime] = None,
    linked_entity_type: Optional[str] = None,
    linked_entity_id: Optional[int] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user),
):
    query = db.query(Task).filter(
        Task.organization_id == org_id,
        Task.is_deleted == False,  # noqa: E712
    )
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if assigned_to_user_id is not None:
        query = query.filter(Task.assigned_to_user_id == assigned_to_user_id)
    if due_before:
        query = query.filter(Task.due_date <= due_before)
    if due_after:
        query = query.filter(Task.due_date >= due_after)
    if linked_entity_type:
        query = query.filter(Task.linked_entity_type == linked_entity_type)
    if linked_entity_id is not None:
        query = query.filter(Task.linked_entity_id == linked_entity_id)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Task.title.ilike(like), Task.description.ilike(like)))

    tasks = query.order_by(Task.created_at.desc()).all()
    return [_to_office_task(task) for task in tasks]


@router.post("/office/tasks", response_model=OfficeTask, status_code=status.HTTP_201_CREATED)
def create_office_task(
    payload: OfficeTaskCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user),
):
    if payload.status not in STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    if payload.priority not in PRIORITIES:
        raise HTTPException(status_code=400, detail="Invalid priority")

    if payload.assigned_to_user_id is not None:
        assignee = db.query(User).filter(User.id == payload.assigned_to_user_id).first()
        if not assignee or assignee.organization_id != org_id:
            raise HTTPException(status_code=400, detail="cross_org_assignment_forbidden")
    else:
        payload.assigned_to_user_id = current_user.id

    db_task = Task(
        organization_id=org_id,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        due_date=payload.due_date,
        assigned_to_user_id=payload.assigned_to_user_id,
        created_by_user_id=current_user.id,
        linked_entity_type=payload.linked_entity_type,
        linked_entity_id=payload.linked_entity_id,
        is_deleted=False,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    log_create(
        db,
        "task",
        db_task.id,
        current_user.id,
        org_id,
        changes={"title": db_task.title, "status": db_task.status},
        entity_name=db_task.title,
    )

    return _to_office_task(db_task)


@router.get("/office/tasks/{task_id}", response_model=OfficeTask)
def get_office_task(
    task_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user),
):
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.organization_id == org_id,
        Task.is_deleted == False,  # noqa: E712
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _to_office_task(task)


from models.event import Event
from models.work import Work
from models.contract import Contract, ContractAsset

@router.put("/office/tasks/{task_id}", response_model=OfficeTask)
def update_office_task(
    task_id: int,
    payload: OfficeTaskUpdate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user),
):
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.organization_id == org_id,
        Task.is_deleted == False,  # noqa: E712
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] not in STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    if "priority" in update_data and update_data["priority"] not in PRIORITIES:
        raise HTTPException(status_code=400, detail="Invalid priority")
    if "assigned_to_user_id" in update_data and update_data["assigned_to_user_id"] is not None:
        assignee = db.query(User).filter(User.id == update_data["assigned_to_user_id"]).first()
        if not assignee or assignee.organization_id != org_id:
            raise HTTPException(status_code=400, detail="cross_org_assignment_forbidden")

    before_status = task.status
    before_assignee = task.assigned_to_user_id
    for field, value in update_data.items():
        setattr(task, field, value)

    # Task -> Event Linkage Logic
    if task.status == "done" and before_status != "done" and task.linked_entity_type == "event":
        event = db.query(Event).filter(Event.id == task.linked_entity_id, Event.organization_id == org_id).first()
        if event:
            event.status = "Completed"

    db.commit()
    db.refresh(task)

    changes = {"title": task.title, "status": task.status}
    if before_status != task.status:
        changes["status_before"] = before_status
        changes["status_after"] = task.status
    if before_assignee != task.assigned_to_user_id:
        changes["assigned_to_before"] = before_assignee
        changes["assigned_to_after"] = task.assigned_to_user_id
    log_update(
        db,
        "task",
        task.id,
        current_user.id,
        org_id,
        changes=changes,
        entity_name=task.title,
    )

    return _to_office_task(task)


from services.governance_service import recompute_status_quo

@router.post("/office/tasks/sync-status-quo", status_code=status.HTTP_201_CREATED)
def sync_status_quo_to_tasks(
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user),
):
    """
    Bridge to Status Quo recompute logic.
    """
    count = recompute_status_quo(db, org_id, current_user.id)
    return {"message": "Sync complete", "tasks_created": count}


@router.delete("/office/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_office_task(
    task_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user),
):
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.organization_id == org_id,
        Task.is_deleted == False,  # noqa: E712
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.is_deleted = True
    db.commit()

    log_delete(
        db,
        "task",
        task.id,
        current_user.id,
        org_id,
        changes={"title": task.title},
        entity_name=task.title,
    )

    return None
