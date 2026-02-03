import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from models.work import Work
from models.artist import Artist
from models.governance import StatusQuoItem
from models.task import Task

def test_office_status_quo_lifecycle(client: TestClient, db_session):
    org_id = uuid4()
    headers = {"X-Organization-ID": str(org_id)}
    
    # 1. Create Work without ISWC (should trigger PUBLISHER_OR_PRO_MISSING)
    work = Work(title="Test Work", organization_id=org_id)
    db_session.add(work)
    db_session.commit()
    
    # 2. Trigger Recompute
    res = client.post("/api/office/status-quo/recompute", headers=headers)
    assert res.status_code == 200
    assert res.json()["items_found"] >= 1
    
    # 3. Verify item exists in list
    res = client.get("/api/office/status-quo", headers=headers)
    assert res.status_code == 200
    items = res.json()
    assert any(i["issue_type"] == "PUBLISHER_OR_PRO_MISSING" for i in items)
    item_id = [i["id"] for i in items if i["issue_type"] == "PUBLISHER_OR_PRO_MISSING"][0]
    
    # 4. Verify Task was auto-generated
    # Task title: "[Status Quo] PUBLISHER_OR_PRO_MISSING: work#<id>"
    res = client.get("/api/office/tasks", headers=headers)
    tasks = res.json()
    assert any("PUBLISHER_OR_PRO_MISSING" in t["title"] for t in tasks)
    
    # 5. Resolve item
    res = client.post(f"/api/office/status-quo/{item_id}/resolve", json={"note": "Fixed manually"}, headers=headers)
    assert res.status_code == 200
    
    # 6. Verify item is resolved (not in default list)
    res = client.get("/api/office/status-quo", headers=headers)
    assert not any(i["id"] == item_id for i in res.json())
    
    # 7. Verify task is moved to 'done'
    res = client.get("/api/office/tasks", headers=headers)
    task = [t for t in res.json() if "PUBLISHER_OR_PRO_MISSING" in t["title"]][0]
    assert task["status"] == "done"

def test_office_reports_lifecycle(client: TestClient, db_session):
    org_id = uuid4()
    headers = {"X-Organization-ID": str(org_id)}
    
    # 1. Run Status Quo Report
    res = client.post("/api/office/reports/run", json={"report_type": "status_quo"}, headers=headers)
    assert res.status_code == 201
    run_id = res.json()["id"]
    
    # 2. Check artifact exists
    res = client.get(f"/api/office/reports/runs/{run_id}/artifacts", headers=headers)
    assert res.status_code == 200
    artifacts = res.json()
    assert any(a["format"] == "pdf" for a in artifacts)
    
    # 3. Share report
    res = client.post(f"/api/office/reports/runs/{run_id}/share", headers=headers)
    assert res.status_code == 200
    assert "document_id" in res.json()
    doc_id = res.json()["document_id"]
    
    # 4. Verify Office Document created
    res = client.get(f"/api/office/documents/{doc_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["doc_type"] == "report"
