from fastapi.testclient import TestClient
from io import BytesIO
from uuid import uuid4

from models.audit_log import AuditLog
from models.user import User
from dependencies import get_current_active_user


def _upload_doc(client: TestClient, headers, filename: str = "doc.pdf", doc_type: str = "contract"):
    files = {"file": (filename, BytesIO(b"%PDF-1.4\n%%EOF"), "application/pdf")}
    data = {"doc_type": doc_type, "title": "Office Doc", "description": "Internal"}
    return client.post("/api/office/documents", data=data, files=files, headers=headers)


def test_documents_are_org_scoped(client: TestClient, db_session, override_dependencies):
    org_a = str(uuid4())
    org_b = str(uuid4())
    headers_a = {"X-Organization-ID": org_a}
    headers_b = {"X-Organization-ID": org_b}

    res = _upload_doc(client, headers_a)
    assert res.status_code == 201, res.text

    list_a = client.get("/api/office/documents", headers=headers_a)
    assert list_a.status_code == 200
    assert len(list_a.json()) == 1

    list_b = client.get("/api/office/documents", headers=headers_b)
    assert list_b.status_code == 200
    assert list_b.json() == []


def test_document_upload_sets_org_and_audits(client: TestClient, db_session, override_dependencies):
    org_id = str(uuid4())
    headers = {"X-Organization-ID": org_id}

    res = _upload_doc(client, headers)
    assert res.status_code == 201
    doc_id = res.json()["id"]
    assert res.json()["organization_id"] == org_id

    audit = db_session.query(AuditLog).filter(
        AuditLog.action == "UPLOAD",
        AuditLog.entity_type == "document",
        AuditLog.entity_id == doc_id,
    ).first()
    assert audit is not None


def test_document_download_audited(client: TestClient, db_session, override_dependencies):
    org_id = str(uuid4())
    headers = {"X-Organization-ID": org_id}

    res = _upload_doc(client, headers)
    doc_id = res.json()["id"]

    dl = client.get(f"/api/office/documents/{doc_id}/download", headers=headers)
    assert dl.status_code == 200

    audit = db_session.query(AuditLog).filter(
        AuditLog.action == "DOWNLOAD",
        AuditLog.entity_type == "document",
        AuditLog.entity_id == doc_id,
    ).first()
    assert audit is not None


def test_cross_org_document_link_forbidden(client: TestClient, db_session, override_dependencies):
    org_a = str(uuid4())
    org_b = uuid4()
    headers_a = {"X-Organization-ID": org_a}

    res = _upload_doc(client, headers_a)
    doc_id = res.json()["id"]

    other_user = User(id=2, email="other@example.com", is_active=True, role="admin", organization_id=org_b, hashed_password="test")
    db_session.add(other_user)
    db_session.commit()

    link_res = client.post(
        f"/api/office/documents/{doc_id}/links",
        json={"entity_type": "task", "entity_id": 999},
        headers=headers_a,
    )
    assert link_res.status_code == 400
    assert link_res.json()["detail"] == "cross_org_link_forbidden"


def test_viewer_can_preview_but_not_delete(client: TestClient, db_session):
    org_id = str(uuid4())
    headers = {"X-Organization-ID": org_id}
    res = _upload_doc(client, headers)
    assert res.status_code == 201
    doc_id = res.json()["id"]

    def override_viewer_user():
        return User(id=3, email="viewer@example.com", is_active=True, role="member", organization_id=uuid4(), hashed_password="test")

    from main import app
    app.dependency_overrides[get_current_active_user] = override_viewer_user

    preview = client.get(f"/api/office/documents/{doc_id}/preview", headers=headers)
    assert preview.status_code == 200

    delete_res = client.delete(f"/api/office/documents/{doc_id}", headers=headers)
    assert delete_res.status_code == 403

    app.dependency_overrides = {}
