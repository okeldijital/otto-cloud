from datetime import date
from typing import Optional

from schemas.ai_contracts import ContractExtractionV1
from schemas.ai_contracts_v2 import (
    ContractExtractV2,
    ExtractionSourceV2,
    PartyV2,
    SplitV2,
    TermV2,
    TrackMentionV2,
)
from services.ai.extractors.contract_extractor_v1 import deterministic_extract


def _safe_evidence(text: Optional[str]) -> list[str]:
    if not text:
        return []
    chunk = text.strip()
    if not chunk:
        return []
    return [chunk[:120]]


def deterministic_extract_v2(text: str, filename: str, file_sha256: str, page_count: Optional[int]) -> ContractExtractV2:
    legacy: ContractExtractionV1 = deterministic_extract(text=text, filename=filename)

    parties = []
    for p in (legacy.parties or []):
        role_raw = (p.role or "unknown").lower()
        role = "unknown"
        if "label" in role_raw:
            role = "label"
        elif "remix" in role_raw:
            role = "remixer"
        elif "artist" in role_raw:
            role = "artist"
        elif "producer" in role_raw:
            role = "producer"
        elif "publisher" in role_raw:
            role = "publisher"
        elif role_raw not in {"", "unknown"}:
            role = "other"

        evidence = []
        source = getattr(p, "source", None)
        if source:
            evidence = _safe_evidence(str(source))
        parties.append(
            PartyV2(
                display_name=p.display_name,
                role=role,
                confidence=float(p.confidence or 0.0),
                evidence=evidence,
            )
        )

    party_lookup = {}
    idx = 0
    for party in parties:
        party_lookup[party.display_name.lower()] = idx
        idx += 1

    splits = []
    for s in (legacy.splits or []):
        split_type = "other"
        split_type_raw = getattr(s, "split_type", None)
        split_type_value = split_type_raw.value if hasattr(split_type_raw, "value") else str(split_type_raw or "")
        low = split_type_value.lower()
        if "master" in low:
            split_type = "master"
        elif "publish" in low:
            split_type = "publishing"

        party_name = s.party_name if s.party_name and s.party_name != "Unknown Party" else None
        party_ref = party_lookup.get((party_name or "").lower()) if party_name else None
        splits.append(
            SplitV2(
                split_type=split_type,
                percent=float(s.percent or 0.0),
                party_ref=party_ref,
                party_name=party_name,
                notes=s.notes,
                evidence=_safe_evidence(s.notes),
            )
        )

    tracks = []
    track_titles = []
    if hasattr(legacy, "tracks") and isinstance(legacy.tracks, list):
        track_titles = [t for t in legacy.tracks if isinstance(t, str)]
    if not track_titles:
        wh = legacy.works_hints or {}
        if isinstance(wh, dict):
            track_titles = list(wh.get("tracks") or [])
        else:
            track_titles = list(getattr(wh, "tracks", []) or [])

    for t in track_titles:
        tracks.append(TrackMentionV2(title=t, confidence=0.65, evidence=_safe_evidence(t)))

    terms = []
    terms_v1 = getattr(legacy, "terms", None)
    if terms_v1:
        if getattr(terms_v1, "territory", None):
            terms.append(TermV2(term_type="territory", summary=terms_v1.territory, evidence=_safe_evidence(terms_v1.territory), confidence=0.7))
        if getattr(terms_v1, "exclusivity", None):
            terms.append(TermV2(term_type="exclusivity", summary=terms_v1.exclusivity, evidence=_safe_evidence(terms_v1.exclusivity), confidence=0.7))
        if getattr(terms_v1, "grant_of_rights", None):
            terms.append(TermV2(term_type="grant_of_rights", summary=terms_v1.grant_of_rights, evidence=_safe_evidence(terms_v1.grant_of_rights), confidence=0.7))
        if getattr(terms_v1, "term_summary", None):
            terms.append(TermV2(term_type="termination", summary=terms_v1.term_summary, evidence=_safe_evidence(terms_v1.term_summary), confidence=0.7))
        if getattr(terms_v1, "royalty_basis", None):
            terms.append(TermV2(term_type="royalty", summary=terms_v1.royalty_basis, evidence=_safe_evidence(terms_v1.royalty_basis), confidence=0.65))

    warnings = list(legacy.warnings or [])

    end_date = legacy.end_date or legacy.expiration_date
    end_date_note = None
    if end_date is None:
        end_date_note = "no end date specified"

    return ContractExtractV2(
        contract_title=legacy.contract_title or filename.rsplit(".", 1)[0],
        parser_version="deterministic_v2",
        raw_confidence=float(legacy.raw_confidence or 0.0),
        warnings=warnings,
        errors=[],
        effective_date=legacy.effective_date,
        start_date=legacy.start_date or legacy.effective_date,
        end_date=end_date,
        end_date_note=end_date_note,
        parties=parties,
        splits=splits,
        splits_total=round(sum([float(s.percent or 0.0) for s in splits]), 3) if splits else None,
        tracks_mentioned=tracks,
        terms=terms,
        source=ExtractionSourceV2(filename=filename, file_sha256=file_sha256, page_count=page_count),
    )
