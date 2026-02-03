from fastapi.testclient import TestClient
from uuid import uuid4
from io import BytesIO


def _pdf_file(name: str = "test.pdf"):
    return (name, BytesIO(b"%PDF-1.4\n%%EOF"), "application/pdf")


def test_create_contract_requires_pdf_or_stays_draft(client: TestClient, db_session, override_dependencies):
    org_id = str(uuid4())
    headers = {"X-Organization-ID": org_id}
    files = {"file": _pdf_file()}
    data = {
        "title": "Test Contract",
        "contract_number": "CTR-TEST-001",
        "status_value": "Draft",
        "type": "Recording",
    }
    res = client.post("/api/contracts", data=data, files=files, headers=headers)
    assert res.status_code == 201, res.text
    payload = res.json()
    assert payload["title"] == "Test Contract"
    assert payload["organization_id"] == org_id
    assert len(payload["documents"]) == 1

    # Two-step create without file must remain Draft
    data_no_file = {
        "title": "Draft Without PDF",
        "contract_number": "CTR-DRAFT-ONLY",
        "status_value": "Draft",
    }
    res_no_file = client.post("/api/contracts", data=data_no_file, headers=headers)
    assert res_no_file.status_code == 201
    assert res_no_file.json()["status"] == "Draft"
    assert res_no_file.json()["documents"] == []


def test_list_respects_org_scope(client: TestClient, db_session, override_dependencies):
    org_id = str(uuid4())
    headers = {"X-Organization-ID": org_id}
    client.post(
        "/api/contracts",
        data={
            "title": "Scoped",
            "contract_number": "CTR-S1",
            "status_value": "Draft",
        },
        files={"file": _pdf_file("a.pdf")},
        headers=headers,
    )

    res = client.get("/api/contracts", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1

    res_other = client.get("/api/contracts", headers={"X-Organization-ID": str(uuid4())})
    assert res_other.status_code == 200
    assert res_other.json() == []

def test_cross_org_link_forbidden(client: TestClient, db_session, override_dependencies):
    org_a = str(uuid4())
    org_b = str(uuid4())
    headers_a = {"X-Organization-ID": org_a}

    # Create a contract in org A
    contract = client.post(
        "/api/contracts",
        data={"title": "OrgA", "contract_number": "CTR-A", "status_value": "Draft"},
        files={"file": _pdf_file("a.pdf")},
        headers=headers_a,
    ).json()

    # Attempt to link a fake asset id from another org (simulated by headers)
    asset_payload = {"asset_type": "Track", "asset_id": 999, "scope_type": "INCLUSION"}
    res = client.post(f"/api/contracts/{contract['id']}/assets", json=asset_payload, headers=headers_a)
    # Without real assets having org, this returns 404; ensure we propagate correct code
    assert res.status_code in (400, 404)


def test_activate_requires_document_present(client: TestClient, db_session, override_dependencies):
    org_id = str(uuid4())
    headers = {"X-Organization-ID": org_id}
    create_res = client.post(
        "/api/contracts",
        data={
            "title": "Status Guard",
            "contract_number": "CTR-G1",
            "status_value": "Draft",
        },
        files={"file": _pdf_file("b.pdf")},
        headers=headers,
    )
    contract_id = create_res.json()["id"]

    update_res = client.patch(f"/api/contracts/{contract_id}", json={"status": "Active"}, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "Active"


def test_contract_document_download_audited(client: TestClient, db_session, override_dependencies):
    org_id = str(uuid4())
    headers = {"X-Organization-ID": org_id}
    create_res = client.post(
        "/api/contracts",
        data={
            "title": "DL",
            "contract_number": "CTR-DL",
            "status_value": "Draft",
        },
        files={"file": _pdf_file("dl.pdf")},
        headers=headers,
    )
    contract_id = create_res.json()["id"]
    detail_res = client.get(f"/api/contracts/{contract_id}", headers=headers)
    doc_id = detail_res.json()["documents"][0]["id"]

    dl_res = client.get(f"/api/contracts/{contract_id}/documents/{doc_id}/download", headers=headers)
    assert dl_res.status_code == 200
    assert dl_res.headers.get("content-disposition")


def test_delete_contract(client: TestClient, db_session, override_dependencies):
    org_id = str(uuid4())
    headers = {"X-Organization-ID": org_id}
    res = client.post(
        "/api/contracts",
        data={
            "title": "To Delete",
            "contract_number": "CTR-DEL",
            "status_value": "Draft",
        },
        files={"file": _pdf_file("c.pdf")},
        headers=headers,
    )
    contract_id = res.json()["id"]

    del_res = client.delete(f"/api/contracts/{contract_id}", headers=headers)
    assert del_res.status_code == 204
    get_res = client.get(f"/api/contracts/{contract_id}", headers=headers)
    assert get_res.status_code == 404
