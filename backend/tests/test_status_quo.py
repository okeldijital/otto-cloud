import pytest
from fastapi.testclient import TestClient
from uuid import uuid4, UUID
from io import BytesIO
from models.work import Work
import os


def _pdf_file(name: str = "test.pdf"):
    return (name, BytesIO(b"%PDF-1.4\n%%EOF"), "application/pdf")


def test_works_admin_status_red_when_registration_missing(client: TestClient, db_session, override_dependencies):
    org_id = str(uuid4())
    headers = {"X-Organization-ID": org_id}
    
    # Create a work in db
    work = Work(title="Test Work")
    db_session.add(work)
    db_session.commit()
    
    # GET works-admin (auto-creates)
    res = client.get(f"/api/works-admin/{work.id}", headers=headers)
    assert res.status_code == 200
    payload = res.json()
    assert payload["registration_status"] == "Unknown"
    # Should be RED because status is Unknown
    assert payload["status_quo"]["status"] == "RED"
    assert any("unknown" in r.lower() for r in payload["status_quo"]["reasons"])


def test_works_admin_status_green_when_requirements_met(client: TestClient, db_session, override_dependencies):
    org_id = str(uuid4())
    headers = {"X-Organization-ID": org_id}
    
    # Create a work in db with ISWC
    work = Work(title="Green Work", iswc_code="T-123.456.789-0")
    db_session.add(work)
    db_session.commit()
    
    # Get admin
    res = client.get(f"/api/works-admin/{work.id}", headers=headers)
    admin_id = res.json()["id"]
    
    # Upload proof
    files = {"file": _pdf_file("proof.pdf")}
    client.post(f"/api/works-admin/{admin_id}/documents", data={"doc_type": "RegistrationProof"}, files=files, headers=headers)
    
    # Update status to Registered
    res = client.patch(f"/api/works-admin/{admin_id}", json={"registration_status": "Registered"}, headers=headers)
    payload = res.json()
    assert payload["registration_status"] == "Registered"
    assert payload["status_quo"]["status"] == "GREEN"


def test_works_admin_documents_download_audited(client: TestClient, db_session, override_dependencies):
    org_id = str(uuid4())
    headers = {"X-Organization-ID": org_id}
    
    work = Work(title="Audit Work")
    db_session.add(work)
    db_session.commit()
    
    res = client.get(f"/api/works-admin/{work.id}", headers=headers)
    admin_id = res.json()["id"]
    
    files = {"file": _pdf_file("audit.pdf")}
    upload_res = client.post(f"/api/works-admin/{admin_id}/documents", data={"doc_type": "Other"}, files=files, headers=headers)
    doc_id = upload_res.json()["documents"][0]["id"]
    
    dl_res = client.get(f"/api/works-admin/{admin_id}/documents/{doc_id}/download", headers=headers)
    assert dl_res.status_code == 200


def test_status_quo_overall_red_when_any_red_exists(client: TestClient, db_session, override_dependencies):
    org_id = str(uuid4())
    headers = {"X-Organization-ID": org_id}
    
    # Create a work (Red because Unknown by default)
    work = Work(title="W1")
    db_session.add(work)
    db_session.commit()
    client.get(f"/api/works-admin/{work.id}", headers=headers)
    
    # Check dashboard
    res = client.get("/api/admin-of-works/status-quo", headers=headers)
    assert res.status_code == 200
    payload = res.json()
    assert payload["summary"]["overall_status"] == "RED"
    assert len(payload["alerts"]["missing_registration_proof"]) > 0


def test_status_quo_org_isolation(client: TestClient, db_session, override_dependencies):
    org_a = str(uuid4())
    org_b = str(uuid4())
    
    # Create work in Org A
    work_a = Work(title="Work A")
    db_session.add(work_a)
    db_session.commit()
    client.get(f"/api/works-admin/{work_a.id}", headers={"X-Organization-ID": org_a})
    
    # Dash Org A should show 1 work
    res_a = client.get("/api/admin-of-works/status-quo", headers={"X-Organization-ID": org_a})
    assert len(res_a.json()["works"]) == 1
    
    # Dash Org B should show 0 works
    res_b = client.get("/api/admin-of-works/status-quo", headers={"X-Organization-ID": org_b})
    assert len(res_b.json()["works"]) == 0
