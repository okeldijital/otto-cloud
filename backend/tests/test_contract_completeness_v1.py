from services.contracts.completeness import compute_contract_completeness


def test_completeness_all_missing_is_red_and_low():
    c = compute_contract_completeness(
        documents_count=0,
        tracks_count=0,
        parties_count=0,
        territory=None,
        effective_date_present=False,
        end_date_known=True,
        term_present=False,
    )
    assert c.status_quo == "red"
    assert c.score == 0
    codes = {r.code for r in c.reasons}
    assert "missing_documents" in codes
    assert "missing_tracks" in codes
    assert "missing_parties" in codes


def test_create_with_missing_parties_stays_red():
    c = compute_contract_completeness(
        documents_count=1,
        tracks_count=1,
        parties_count=0,
        territory="Worldwide",
        effective_date_present=False,
        end_date_known=True,
        term_present=True,
    )
    assert c.status_quo == "red"
    assert c.score == 65
    assert any(r.code == "missing_parties" for r in c.reasons)


def test_green_only_when_docs_tracks_parties_present():
    c = compute_contract_completeness(
        documents_count=1,
        tracks_count=2,
        parties_count=1,
        territory="Worldwide",
        effective_date_present=True,
        end_date_known=True,
        term_present=True,
    )
    assert c.status_quo == "green"
    assert c.score == 100
    assert c.reasons == []
