from uuid import uuid4
from datetime import datetime, timedelta

from models.audit_log import AuditLog
from models.user import User


def _payload(overrides=None):
    base = {
        "title": "Ship metadata",
        "description": "Confirm registration deadline",
        "status": "todo",
        "priority": "high",
        "due_date": (datetime.utcnow() + timedelta(days=2)).isoformat(),
        "assigned_to_user_id": 1,
        "linked_entity_type": "RELEASE",
        "linked_entity_id": 10,
    }
    if overrides:
        base.update(overrides)
    return base


def test_tasks_are_org_scoped(client, db_session):
    res = client.post("/api/office/tasks", json=_payload())
    assert res.status_code == 201

    other_org = str(uuid4())
    res_other = client.get("/api/office/tasks", headers={"X-Organization-ID": other_org})
    assert res_other.status_code == 200
    assert res_other.json() == []


def test_task_create_creates_audit_log(client, db_session):
    res = client.post("/api/office/tasks", json=_payload())
    assert res.status_code == 201
    task_id = res.json()["id"]

    audit = db_session.query(AuditLog).filter(
        AuditLog.entity_type == "task",
        AuditLog.entity_id == task_id,
        AuditLog.action == "UPLOAD",
    ).first()
    assert audit is not None


def test_task_status_update_creates_audit_log_with_before_after(client, db_session):
    res = client.post("/api/office/tasks", json=_payload())
    assert res.status_code == 201
    task_id = res.json()["id"]

    res_update = client.put(f"/api/office/tasks/{task_id}", json={"status": "in_progress"})
    assert res_update.status_code == 200

    audit = db_session.query(AuditLog).filter(
        AuditLog.entity_type == "task",
        AuditLog.entity_id == task_id,
        AuditLog.action == "UPDATE",
    ).first()
    assert audit is not None
    assert audit.changes["status_before"] == "todo"
    assert audit.changes["status_after"] == "in_progress"


def test_task_delete_creates_audit_log(client, db_session):
    res = client.post("/api/office/tasks", json=_payload())
    assert res.status_code == 201
    task_id = res.json()["id"]

    res_delete = client.delete(f"/api/office/tasks/{task_id}")
    assert res_delete.status_code == 204

    audit = db_session.query(AuditLog).filter(
        AuditLog.entity_type == "task",
        AuditLog.entity_id == task_id,
        AuditLog.action == "DELETE",
    ).first()
    assert audit is not None


def test_cross_org_assignment_forbidden(client, db_session):
    other_org = uuid4()
    other_user = User(id=2, email="other@example.com", is_active=True, role="admin", organization_id=other_org, hashed_password="test")
    db_session.add(other_user)
    db_session.commit()

    res = client.post("/api/office/tasks", json=_payload({"assigned_to_user_id": 2}))
    assert res.status_code == 400
    assert res.json()["detail"] == "cross_org_assignment_forbidden"
