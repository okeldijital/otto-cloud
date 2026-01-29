from fastapi.testclient import TestClient

def test_phase_2_catalog_workflow(client: TestClient, override_dependencies):
    """
    Test Phase 2 features:
    - Distributors
    - Artists with extended fields
    - Release relationships (Artist, Distributor)
    - Work/Track relationships
    """
    # 1. Create Distributor
    dist_payload = {"name": "DistroKid", "website": "https://distrokid.com"}
    response = client.post("/api/crm/distributors/", json=dist_payload)
    assert response.status_code == 201
    distributor = response.json()
    assert distributor["name"] == "DistroKid"
    dist_id = distributor["id"]

    # 2. Create Label
    label_payload = {"name": "Test Label"}
    response = client.post("/api/catalog/labels/", json=label_payload)
    assert response.status_code == 201
    label_id = response.json()["id"]

    # 3. Create Artist with Banking Details
    artist_payload = {
        "name": "Test Artist",
        "banking_details": {
            "bank_name": "Chase",
            "account_number": "123456789",
            "branch_code": "001"
        },
        "streaming_links": {
            "spotify": "http://spotify.com/artist/1"
        }
    }
    response = client.post("/api/catalog/artists/", json=artist_payload)
    assert response.status_code == 201
    artist = response.json()
    artist_id = artist["id"]
    # Verify banking details retrieved correctly
    assert artist["banking_details"]["bank_name"] == "Chase"

    # 4. Create Release (Linked to Artist, Label, Distributor)
    release_payload = {
        "title": "Test Album",
        "artist_id": artist_id,
        "label_id": label_id,
        "distributor_id": dist_id,
        "release_date": "2024-01-01",
        "release_type": "Album"
    }
    response = client.post("/api/catalog/releases/", json=release_payload)
    assert response.status_code == 201
    release = response.json()
    release_id = release["id"]
    assert release["artist_id"] == artist_id
    assert release["distributor_id"] == dist_id

    # 5. Create Work
    work_payload = {"title": "Test Song", "composers_text": "Me & You"}
    response = client.post("/api/catalog/works/", json=work_payload)
    assert response.status_code == 201
    work_id = response.json()["id"]

    # 6. Create Track (Linked to Release & Work)
    track_payload = {
        "title": "Test Song (Album Ver)",
        "release_id": release_id,
        "work_id": work_id,
        "track_number": 1,
        "duration": "03:30",
        "isrc": "US12345"
    }
    response = client.post("/api/catalog/tracks/", json=track_payload)
    assert response.status_code == 201
    track = response.json()
    assert track["work_id"] == work_id
    assert track["release_id"] == release_id


def test_phase_3_contracts_workflow(client: TestClient, override_dependencies):
    """
    Test Phase 3 features:
    - Contract fields (status, file_path, title)
    - Templates (is_template)
    """
    # 1. Create a Standard Contract
    contract_payload = {
        "title": "360 Deal",
        "status": "Active",
        "start_date": "2024-01-01",
        "file_path": "/uploads/test.pdf",
        "is_template": False
    }
    response = client.post("/api/contracts/", json=contract_payload)
    assert response.status_code == 201
    contract = response.json()
    assert contract["title"] == "360 Deal"
    assert contract["status"] == "Active"
    assert contract["is_template"] is False

    # 2. Create a Template
    template_payload = {
        "title": "Standard Split Template",
        "status": "Draft",
        "terms": "Standard Terms...",
        "is_template": True
    }
    response = client.post("/api/contracts/", json=template_payload)
    assert response.status_code == 201
    template = response.json()
    assert template["is_template"] is True

    # 3. List and Verify
    response = client.get("/api/contracts/")
    assert response.status_code == 200
    all_contracts = response.json()
    assert len(all_contracts) >= 2
    
    # Filter in test to verify data integrity
    templates = [c for c in all_contracts if c["is_template"]]
    real_contracts = [c for c in all_contracts if not c["is_template"]]
    
    assert len(templates) >= 1
    assert len(real_contracts) >= 1
    assert templates[0]["title"] == "Standard Split Template"
