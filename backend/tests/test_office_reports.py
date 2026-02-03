from uuid import uuid4

from models.audit_log import AuditLog


def test_reports_are_org_scoped(client, db_session):
    org_a = str(uuid4())
    org_b = str(uuid4())

    res = client.post(
        "/api/office/reports/definitions",
        json={"name": "Catalog A", "report_type": "catalog_snapshot", "config": {}},
        headers={"X-Organization-ID": org_a},
    )
    assert res.status_code == 201
    def_id = res.json()["id"]

    other = client.get(f"/api/office/reports/definitions/{def_id}", headers={"X-Organization-ID": org_b})
    assert other.status_code == 404


def test_create_report_definition_audited(client, db_session):
    org_id = str(uuid4())
    res = client.post(
        "/api/office/reports/definitions",
        json={"name": "Contracts Overview", "report_type": "contracts_overview", "config": {}},
        headers={"X-Organization-ID": org_id},
    )
    assert res.status_code == 201
    def_id = res.json()["id"]

    audit = db_session.query(AuditLog).filter(
        AuditLog.entity_type == "report_definition",
        AuditLog.entity_id == def_id,
        AuditLog.action == "UPLOAD",
    ).first()
    assert audit is not None


def test_run_report_creates_run_and_artifacts(client, db_session):
    org_id = str(uuid4())
    run = client.post(
        "/api/office/reports/run",
        json={"report_type": "contracts_overview", "parameters": {}},
        headers={"X-Organization-ID": org_id},
    )
    assert run.status_code == 201
    run_id = run.json()["id"]

    artifacts = client.get(f"/api/office/reports/runs/{run_id}/artifacts", headers={"X-Organization-ID": org_id})
    assert artifacts.status_code == 200
    assert len(artifacts.json()) >= 1


def test_report_artifact_download_audited(client, db_session):
    org_id = str(uuid4())
    run = client.post(
        "/api/office/reports/run",
        json={"report_type": "contracts_overview", "parameters": {}},
        headers={"X-Organization-ID": org_id},
    )
    run_id = run.json()["id"]
    artifacts = client.get(f"/api/office/reports/runs/{run_id}/artifacts", headers={"X-Organization-ID": org_id}).json()
    artifact_id = artifacts[0]["id"]

    dl = client.get(f"/api/office/reports/artifacts/{artifact_id}/download", headers={"X-Organization-ID": org_id})
    assert dl.status_code == 200

    audit = db_session.query(AuditLog).filter(
        AuditLog.entity_type == "report_artifact",
        AuditLog.entity_id == artifact_id,
        AuditLog.action == "DOWNLOAD",
    ).first()
    assert audit is not None


def test_cross_org_report_definition_404(client, db_session):
    org_id = str(uuid4())
    res = client.post(
        "/api/office/reports/definitions",
        json={"name": "Catalog B", "report_type": "catalog_snapshot", "config": {}},
        headers={"X-Organization-ID": org_id},
    )
    def_id = res.json()["id"]

    res_other = client.get(
        f"/api/office/reports/definitions/{def_id}",
        headers={"X-Organization-ID": str(uuid4())},
    )
    assert res_other.status_code == 404
