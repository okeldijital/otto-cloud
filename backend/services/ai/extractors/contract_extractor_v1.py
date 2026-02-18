import re
from datetime import datetime
from typing import Optional

from schemas.ai_contracts import (
    ContractDatesV2,
    ContractExtractionV1,
    ContractPartyV1,
    ContractSplitV1,
    ContractTermsV2,
    SplitTypeV1,
)
from services.ai.parsing.rules.remix_agreement_v1 import (
    extract_parties_from_text,
    extract_splits_governed,
    extract_work_hints,
)


def _to_date(raw: Optional[str]):
    if not raw:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except Exception:
            continue
    return None


def deterministic_extract(text: str, filename: Optional[str] = None) -> ContractExtractionV1:
    warnings = []
    parser_version = "deterministic_v1"

    raw_parties = extract_parties_from_text(text)
    parties = [ContractPartyV1(**p) for p in raw_parties]
    if not parties:
        warnings.append("no_parties_detected")

    raw_splits = extract_splits_governed(text, raw_parties)
    splits = [ContractSplitV1(**s) for s in raw_splits]

    if parties:
        for split in splits:
            if split.party_name == "Unknown Party" and len(parties) == 1:
                split.party_name = parties[0].display_name
                split.party_role = parties[0].role

    splits_total = round(sum(s.percent for s in splits), 3)
    if abs(splits_total - 100.0) > 0.05 and splits_total > 0:
        warnings.append(f"splits_total_mismatch: Computed total is {splits_total}%")

    hints_dict = extract_work_hints(text)

    date_match = re.search(r"(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}|\d{2}\.\d{2}\.\d{4})", text or "")
    effective_date = _to_date(date_match.group(1)) if date_match else None

    if not effective_date:
        warnings.append("effective_date_not_specified")
    warnings.append("no_end_date_specified")

    title = None
    if filename:
        title = re.sub(r"\.pdf$", "", filename, flags=re.IGNORECASE)

    terms = ContractTermsV2(
        governing_law="South Africa" if "south africa" in (text or "").lower() else None,
        term_summary="term-based agreement" if re.search(r"\b\d+\s+years?\b", text or "", re.IGNORECASE) else None,
    )

    dates = ContractDatesV2(
        contract_date=effective_date.isoformat() if effective_date else None,
        effective_date=effective_date.isoformat() if effective_date else None,
        start_date=effective_date.isoformat() if effective_date else None,
        end_date=None,
        expiration_date=None,
        end_date_specified=False,
        source="deterministic",
    )

    confidence = 0.5
    if parties and splits:
        confidence = 0.8
    elif parties or splits:
        confidence = 0.6

    return ContractExtractionV1(
        contract_title=title or "Governed Extraction (Deterministic V1)",
        contract_date=effective_date,
        effective_date=effective_date,
        start_date=effective_date,
        parties=parties,
        splits=splits,
        splits_total=splits_total,
        works_hints=hints_dict,
        raw_confidence=confidence,
        warnings=warnings,
        parser_version=parser_version,
        dates=dates,
        terms=terms,
        key_terms=[
            {"key": "governing_law", "value": terms.governing_law or "", "source": "deterministic"},
        ],
    )


def extract_contract_intelligence(text: str, filename: Optional[str] = None) -> ContractExtractionV1:
    return deterministic_extract(text, filename=filename)
