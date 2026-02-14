import pytest
from services.ai.extractors.contract_extractor_v1 import deterministic_extract

def test_extract_quality_remix_agreement():
    """
    Test extraction quality on a sample remix agreement text.
    """
    sample_text = """
    REMIX AGREEMENT
    
    This agreement is between M2KR (the "Label") and Kaargo (the "Remixer").
    Effective Date: 2024-03-15
    
    The Remixer shall provide a remix of the track "Midnight Groove".
    
    In consideration, the Label shall pay the Remixer 30% of net receipts.
    The remaining 70% shall be retained by the Label.
    """
    
    extraction = deterministic_extract(sample_text)
    
    # 1. Check Parties
    assert len(extraction.parties) >= 2
    party_names = [p.display_name for p in extraction.parties]
    assert "Kaargo" in party_names
    assert "M2KR" in party_names
    
    # 2. Check Splits Total
    assert extraction.splits_total == 100.0
    assert not any("splits_total_mismatch" in w for w in extraction.warnings)
    
    # 3. Check Work Hints
    assert "Midnight Groove" in extraction.works_hints.tracks
    
    # 4. Check Parser Version
    assert extraction.parser_version == "deterministic_v1"
    
    # 5. Check mapping of roles
    remixer = next(p for p in extraction.parties if "Kaargo" in p.display_name)
    assert remixer.role == "Artist" # As mapped in rules

def test_extract_quality_split_mismatch():
    """
    Test warning when splits don't total 100.
    """
    sample_text = "The Label pays 25%."
    extraction = deterministic_extract(sample_text)
    
    assert extraction.splits_total == 25.0
    assert any("splits_total_mismatch" in w for w in extraction.warnings)

def test_no_unknown_party_when_identifiable():
    """
    Ensure no 'Unknown Party' when we have identified parties.
    """
    sample_text = "Label: M2KR. They get 100%."
    extraction = deterministic_extract(sample_text)
    
    assert len(extraction.parties) == 1
    assert extraction.parties[0].display_name == "M2KR"
    assert extraction.splits[0].party_name == "M2KR"
    assert extraction.splits[0].party_name != "Unknown Party"
