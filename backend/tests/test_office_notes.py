from uuid import uuid4

from models.audit_log import AuditLog
from models.office_note import OfficeNote
from models.task import Task
from models.user import User
from dependencies import get_current_active_user


def test_notes_are_org_scoped(client, db_session):
    res = client.post("/api/office/notes", json={"body": "Org A note"})
    assert res.status_code == 201

    other_org = str(uuid4())
    res_other = client.get("/api/office/notes", headers={"X-Organization-ID": other_org})
    assert res_other.status_code == 200
    assert res_other.json() == []


def test_note_create_update_delete_audited(client, db_session):
    res = client.post("/api/office/notes", json={"title": "Ops", "body": "Initial"})
    assert res.status_code == 201
    note_id = res.json()["id"]

    update_res = client.patch(f"/api/office/notes/{note_id}", json={"body": "Updated"})
    assert update_res.status_code == 200

    delete_res = client.delete(f"/api/office/notes/{note_id}")
    assert delete_res.status_code == 204

    actions = db_session.query(AuditLog).filter(
        AuditLog.entity_type == "note",
        AuditLog.entity_id == note_id,
    ).all()
    action_names = {a.action for a in actions}
    assert "UPLOAD" in action_names
    assert "UPDATE" in action_names
    assert "DELETE" in action_names


def test_cross_org_note_link_forbidden(client, db_session, override_dependencies):
    res = client.post("/api/office/notes", json={"body": "Link target"})
    assert res.status_code == 201
    note_id = res.json()["id"]

    other_org = uuid4()
    other_user = User(id=2, email="other@example.com", is_active=True, role="admin", organization_id=other_org, hashed_password="test")
    db_session.add(other_user)
    db_session.commit()

    other_task = Task(
        organization_id=other_org,
        title="Other Task",
        description=None,
        status="todo",
        priority="low",
        due_date=None,
        assigned_to_user_id=2,
        created_by_user_id=2,
        linked_entity_type=None,
        linked_entity_id=None,
        is_deleted=False,
    )
    db_session.add(other_task)
    db_session.commit()
    db_session.refresh(other_task)

    link_res = client.post(
        f"/api/office/notes/{note_id}/links",
        json={"entity_type": "task", "entity_id": other_task.id},
    )
    assert link_res.status_code == 400
    assert link_res.json()["detail"] == "cross_org_link_forbidden"


def test_viewer_cannot_write_notes(client, db_session):
    def override_viewer_user():
        return User(id=3, email="viewer@example.com", is_active=True, role="member", organization_id=uuid4(), hashed_password="test")

    from main import app
    app.dependency_overrides[get_current_active_user] = override_viewer_user

    res = client.post("/api/office/notes", json={"body": "Viewer note"})
    assert res.status_code == 403
    assert res.json()["detail"] == "notes_editor_required"

    app.dependency_overrides = {}
