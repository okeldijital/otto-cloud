from uuid import uuid4
from datetime import datetime, timedelta

from models.audit_log import AuditLog


def _payload(overrides=None):
    base = {
        "title": "Release planning",
        "event_type": "Release",
        "status": "Planned",
        "start_datetime": datetime.utcnow().isoformat(),
        "end_datetime": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
        "all_day": False,
        "description": "Coordinate rollout",
        "linked_entity_type": "RELEASE",
        "linked_entity_id": 42,
    }
    if overrides:
        base.update(overrides)
    return base


def test_events_are_org_scoped(client, db_session):
    res = client.post("/api/office/events", json=_payload())
    assert res.status_code == 201

    other_org = str(uuid4())
    res_other = client.get("/api/office/events", headers={"X-Organization-ID": other_org})
    assert res_other.status_code == 200
    assert res_other.json() == []


def test_event_create_creates_audit_log(client, db_session):
    res = client.post("/api/office/events", json=_payload())
    assert res.status_code == 201
    event_id = res.json()["id"]

    audit = db_session.query(AuditLog).filter(
        AuditLog.entity_type == "event",
        AuditLog.entity_id == event_id,
        AuditLog.action == "UPLOAD",
    ).first()
    assert audit is not None


def test_event_update_creates_audit_log(client, db_session):
    res = client.post("/api/office/events", json=_payload())
    assert res.status_code == 201
    event_id = res.json()["id"]

    res_update = client.put(f"/api/office/events/{event_id}", json={"status": "Completed"})
    assert res_update.status_code == 200

    audit = db_session.query(AuditLog).filter(
        AuditLog.entity_type == "event",
        AuditLog.entity_id == event_id,
        AuditLog.action == "UPDATE",
    ).first()
    assert audit is not None


def test_event_delete_creates_audit_log(client, db_session):
    res = client.post("/api/office/events", json=_payload())
    assert res.status_code == 201
    event_id = res.json()["id"]

    res_delete = client.delete(f"/api/office/events/{event_id}")
    assert res_delete.status_code == 204

    audit = db_session.query(AuditLog).filter(
        AuditLog.entity_type == "event",
        AuditLog.entity_id == event_id,
        AuditLog.action == "DELETE",
    ).first()
    assert audit is not None


def test_cross_org_event_access_forbidden_or_404(client, db_session):
    res = client.post("/api/office/events", json=_payload())
    assert res.status_code == 201
    event_id = res.json()["id"]

    other_org = str(uuid4())
    res_other = client.get(f"/api/office/events/{event_id}", headers={"X-Organization-ID": other_org})
    assert res_other.status_code == 404
