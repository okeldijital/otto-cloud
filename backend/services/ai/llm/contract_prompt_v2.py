from __future__ import annotations

from textwrap import dedent


def contract_extract_system_prompt_v2() -> str:
    return dedent(
        """
        You are a contract extraction engine.
        Return only strict JSON and do not include markdown.
        Never copy full contract text. Evidence snippets must be short quotes under 120 chars.
        """
    ).strip()


def contract_extract_user_prompt_v2(filename: str, text: str) -> str:
    schema = {
        "contract_title": "string",
        "parser_version": "llm_v2",
        "raw_confidence": 0.0,
        "warnings": [],
        "errors": [],
        "effective_date": None,
        "start_date": None,
        "end_date": None,
        "end_date_note": "no end date specified",
        "parties": [
            {
                "display_name": "string",
                "role": "artist|label|remixer|producer|publisher|other|unknown",
                "confidence": 0.0,
                "evidence": ["short snippet"],
            }
        ],
        "splits": [
            {
                "split_type": "master|publishing|other",
                "percent": 0.0,
                "party_ref": 0,
                "party_name": None,
                "notes": None,
                "evidence": ["short snippet"],
            }
        ],
        "splits_total": None,
        "tracks_mentioned": [
            {"title": "string", "confidence": 0.0, "evidence": ["short snippet"]}
        ],
        "terms": [
            {
                "term_type": "territory|exclusivity|grant_of_rights|termination|deliverables|royalty|credit|other",
                "summary": "string",
                "evidence": ["short snippet"],
                "confidence": 0.0,
            }
        ],
        "source": {"filename": filename, "file_sha256": "string", "page_count": None},
    }

    return dedent(
        f"""
        filename: {filename}
        Extract contract intelligence into this JSON shape exactly:
        {schema}

        Rules:
        - Use null when unknown.
        - If end date is not present, set end_date to null and end_date_note to "no end date specified".
        - If split references a party, set party_ref index or party_name.
        - Keep evidence snippets <=120 chars each.

        contract_text:
        {text}
        """
    ).strip()
