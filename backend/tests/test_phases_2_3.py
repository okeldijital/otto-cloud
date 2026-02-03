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
    dist_payload = {"name": "DistroKid", "website": "https://distrokid.com", "org_type": "Distributor"}
    response = client.post("/api/network/organizations", json=dist_payload)
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

