from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from database import get_db
from models.user import User
from models.task import Task as TaskModel
from schemas.task import Task, TaskCreate, TaskUpdate
from dependencies import get_current_active_user, get_current_organization_id
from core.audit import log_create, log_delete, log_update

router = APIRouter()

@router.get("", response_model=List[Task])
def list_tasks(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to_user_id: Optional[int] = None,
    due_before: Optional[datetime] = None,
    due_after: Optional[datetime] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """List all tasks with optional filtering"""
    query = db.query(TaskModel).filter(
        TaskModel.organization_id == org_id,
        TaskModel.is_deleted == False,  # noqa: E712
    )
    
    if status:
        query = query.filter(TaskModel.status == status)
    if priority:
        query = query.filter(TaskModel.priority == priority)
    if assigned_to_user_id is not None:
        query = query.filter(TaskModel.assigned_to_user_id == assigned_to_user_id)
    if due_before:
        query = query.filter(TaskModel.due_date <= due_before)
    if due_after:
        query = query.filter(TaskModel.due_date >= due_after)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (TaskModel.title.ilike(like)) | (TaskModel.description.ilike(like))
        )
        
    tasks = query.offset(skip).limit(limit).all()
    return tasks

@router.post("", response_model=Task, status_code=status.HTTP_201_CREATED)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new task"""
    if task.assigned_to_user_id is None:
        task.assigned_to_user_id = current_user.id
    else:
        assignee = db.query(User).filter(User.id == task.assigned_to_user_id).first()
        if not assignee or assignee.organization_id != org_id:
            raise HTTPException(status_code=400, detail="cross_org_assignment_forbidden")
        
    db_task = TaskModel(
        **task.model_dump(),
        organization_id=org_id,
        created_by_user_id=current_user.id,
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
    
    return db_task

@router.get("/{task_id}", response_model=Task)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific task by ID"""
    task = db.query(TaskModel).filter(
        TaskModel.id == task_id,
        TaskModel.organization_id == org_id,
        TaskModel.is_deleted == False,  # noqa: E712
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/{task_id}", response_model=Task)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """Update a task"""
    db_task = db.query(TaskModel).filter(
        TaskModel.id == task_id,
        TaskModel.organization_id == org_id,
        TaskModel.is_deleted == False,  # noqa: E712
    ).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_update.model_dump(exclude_unset=True)
    before_status = db_task.status
    before_assignee = db_task.assigned_to_user_id
    if "assigned_to_user_id" in update_data and update_data["assigned_to_user_id"] is not None:
        assignee = db.query(User).filter(User.id == update_data["assigned_to_user_id"]).first()
        if not assignee or assignee.organization_id != org_id:
            raise HTTPException(status_code=400, detail="cross_org_assignment_forbidden")
    for field, value in update_data.items():
        setattr(db_task, field, value)
    
    db.commit()
    db.refresh(db_task)
    
    changes = {"title": db_task.title, "status": db_task.status}
    if before_status != db_task.status:
        changes["status_before"] = before_status
        changes["status_after"] = db_task.status
    if before_assignee != db_task.assigned_to_user_id:
        changes["assigned_to_before"] = before_assignee
        changes["assigned_to_after"] = db_task.assigned_to_user_id
    log_update(
        db,
        "task",
        db_task.id,
        current_user.id,
        org_id,
        changes=changes,
        entity_name=db_task.title,
    )
    
    return db_task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a task"""
    db_task = db.query(TaskModel).filter(
        TaskModel.id == task_id,
        TaskModel.organization_id == org_id,
        TaskModel.is_deleted == False,  # noqa: E712
    ).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_title = db_task.title
    db_task.is_deleted = True
    db.commit()
    
    log_delete(
        db,
        "task",
        task_id,
        current_user.id,
        org_id,
        changes={"title": task_title},
        entity_name=task_title,
    )
    
    return None
