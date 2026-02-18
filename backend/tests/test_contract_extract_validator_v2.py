import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas.ai_contracts_v2 import ContractExtractV2, ExtractionSourceV2, PartyV2, SplitV2
from services.ai.extractors.validators.contract_extract_validator_v2 import validate_contract_extract_v2


def test_validator_sets_end_date_note_and_warnings():
    payload = ContractExtractV2(
        contract_title="Test",
        parser_version="deterministic_v2",
        raw_confidence=0.5,
        warnings=[],
        errors=[],
        effective_date=None,
        start_date=None,
        end_date=None,
        end_date_note=None,
        parties=[PartyV2(display_name="A", role="label", confidence=0.8, evidence=["x" * 200])],
        splits=[SplitV2(split_type="master", percent=30, party_ref=None, party_name=None, notes="n", evidence=["y" * 500])],
        splits_total=None,
        tracks_mentioned=[],
        terms=[],
        source=ExtractionSourceV2(filename="x.pdf", file_sha256="abc", page_count=1),
    )

    out = validate_contract_extract_v2(payload)
    assert out.end_date_note == "no end date specified"
    assert "parties_missing" in out.warnings
    assert "split_party_unmapped" in out.warnings
    assert "tracks_missing" in out.warnings
    assert "terms_missing" in out.warnings
    assert out.splits_total == 30.0
    assert len(out.parties[0].evidence[0]) <= 120
    assert len(out.splits[0].evidence[0]) <= 120


def test_validator_split_total_warning_threshold():
    payload = ContractExtractV2(
        contract_title="Test",
        parser_version="deterministic_v2",
        raw_confidence=0.6,
        warnings=[],
        errors=[],
        effective_date=None,
        start_date=None,
        end_date=None,
        end_date_note="no end date specified",
        parties=[
            PartyV2(display_name="A", role="label", confidence=0.8, evidence=[]),
            PartyV2(display_name="B", role="artist", confidence=0.8, evidence=[]),
        ],
        splits=[
            SplitV2(split_type="master", percent=40, party_ref=0, party_name=None, notes=None, evidence=[]),
            SplitV2(split_type="master", percent=40, party_ref=1, party_name=None, notes=None, evidence=[]),
        ],
        splits_total=None,
        tracks_mentioned=[],
        terms=[],
        source=ExtractionSourceV2(filename="x.pdf", file_sha256="abc", page_count=1),
    )

    out = validate_contract_extract_v2(payload)
    assert out.splits_total == 80.0
    assert "splits_total_mismatch" in out.warnings
