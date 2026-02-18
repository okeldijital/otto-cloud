from __future__ import annotations

from typing import List

from schemas.ai_contracts_v2 import ContractExtractV2


def _clamp_evidence(snippets: List[str]) -> List[str]:
    return [str(s)[:120] for s in (snippets or []) if str(s).strip()]


def validate_contract_extract_v2(payload: ContractExtractV2) -> ContractExtractV2:
    warnings = list(payload.warnings or [])

    # Evidence snippets must be short.
    for p in payload.parties:
        p.evidence = _clamp_evidence(p.evidence)
    for s in payload.splits:
        s.evidence = _clamp_evidence(s.evidence)
    for t in payload.tracks_mentioned:
        t.evidence = _clamp_evidence(t.evidence)
    for term in payload.terms:
        term.evidence = _clamp_evidence(term.evidence)

    if len(payload.parties) < 2:
        warnings.append("parties_missing")

    if payload.splits:
        total = 0.0
        for split in payload.splits:
            total += float(split.percent or 0.0)
            if split.party_ref is None and not split.party_name:
                warnings.append("split_party_unmapped")

        payload.splits_total = round(total, 3)
        if abs(payload.splits_total - 100.0) > 1.0:
            warnings.append("splits_total_mismatch")
    else:
        payload.splits_total = None

    if payload.end_date is None:
        if payload.end_date_note != "no end date specified":
            payload.end_date_note = "no end date specified"

    if not payload.terms:
        warnings.append("terms_missing")

    if not payload.tracks_mentioned:
        warnings.append("tracks_missing")

    # De-duplicate warnings, preserve order.
    deduped = []
    seen = {}
    for item in warnings:
        if item not in seen:
            deduped.append(item)
            seen[item] = True
    payload.warnings = deduped
    return payload
