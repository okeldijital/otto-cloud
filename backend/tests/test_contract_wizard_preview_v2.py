import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.ai.extractors.contract_extractor_deterministic_v2 import deterministic_extract_v2


def test_preview_shape_has_required_v2_sections():
    text = """
    Agreement between M2KR MELT 2000 Revisited and SPIRIT MOTION PTY LTD
    Remix Artist: SPIRIT MOTION PTY LTD
    DJ/Producer Name (aka): BLACK MOTION
    REMIX TRACK TITLE(S):
    x ABANGOMA CAVE MIX TO GO ON THE BLACK MOTION ALBUM REBIRTH of the DRUMS
    REMIXER Royalty Rate: 30 % of net income
    minimum period of 15 years and auto-renewed for periods of 5 years
    """
    out = deterministic_extract_v2(
        text=text,
        filename="sample.pdf",
        file_sha256="abc123",
        page_count=1,
    )

    assert out.contract_title
    assert isinstance(out.parties, list)
    assert isinstance(out.splits, list)
    assert isinstance(out.tracks_mentioned, list)
    assert isinstance(out.terms, list)
    assert out.end_date is None
    assert out.end_date_note == "no end date specified"
