import hashlib
import re
from datetime import datetime
from difflib import SequenceMatcher
from typing import Any, Dict, Optional

from schemas.ai_contracts import (
    ContractDatesV2,
    ContractExtractionV1,
    ContractIntelV2,
    ContractPartyV1,
    ContractPartyV2,
    ContractSplitV1,
    ContractSplitV2,
    ContractTermsV2,
    ContractWorksHintsV2,
    SplitTypeV1,
    WorksHintsV1,
)
from services.ai.llm.client import llm_extract_contract


def _normalize_name(name: Optional[str]) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (name or "").lower()).strip()


def _to_iso(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    val = raw.strip()
    patterns = [
        (r"^\d{4}-\d{2}-\d{2}$", "%Y-%m-%d"),
        (r"^\d{2}/\d{2}/\d{4}$", "%d/%m/%Y"),
        (r"^\d{2}\.\d{2}\.\d{4}$", "%d.%m.%Y"),
    ]
    for pat, fmt in patterns:
        if re.match(pat, val):
            try:
                return datetime.strptime(val, fmt).date().isoformat()
            except Exception:
                return None
    return None


def _closest_party(split_name: Optional[str], parties: list[ContractPartyV2]) -> Optional[str]:
    if not split_name:
        return None
    nsplit = _normalize_name(split_name)
    if not nsplit:
        return None
    best_name = None
    best_score = 0.0
    for party in parties:
        p = party.display_name
        np = _normalize_name(p)
        if nsplit == np:
            return p
        if nsplit in np or np in nsplit:
            score = 0.95
        else:
            score = SequenceMatcher(a=nsplit, b=np).ratio()
        if score > best_score:
            best_name = p
            best_score = score
    if best_score >= 0.72:
        return best_name
    return None


def _v2_from_json(payload: Dict[str, Any], filename: str) -> ContractIntelV2:
    dates_raw = payload.get("dates") or {}
    dates = ContractDatesV2(
        contract_date=_to_iso(dates_raw.get("contract_date")) or _to_iso(payload.get("contract_date")),
        effective_date=_to_iso(dates_raw.get("effective_date")) or _to_iso(payload.get("effective_date")),
        start_date=_to_iso(dates_raw.get("start_date")) or _to_iso(payload.get("start_date")),
        end_date=_to_iso(dates_raw.get("end_date")) or _to_iso(payload.get("end_date")),
        expiration_date=_to_iso(dates_raw.get("expiration_date")) or _to_iso(payload.get("expiration_date")),
        source=dates_raw.get("source") or "llm",
    )
    dates.end_date_specified = bool(dates.end_date or dates.expiration_date)

    parties = []
    for p in (payload.get("parties") or []):
        display_name = (p.get("display_name") or p.get("name") or "").strip()
        if not display_name:
            continue
        parties.append(
            ContractPartyV2(
                name=p.get("name") or display_name,
                display_name=display_name,
                role=p.get("role"),
                confidence=float(p.get("confidence") or 0.0),
                source=p.get("source") or "llm",
            )
        )

    splits = []
    for s in (payload.get("splits") or []):
        split = ContractSplitV2(
            scope=(s.get("scope") or "MASTER").upper(),
            percent=float(s.get("percent") or 0.0),
            party_display_name=(s.get("party_display_name") or s.get("party_name")),
            party_role=s.get("party_role"),
            notes=s.get("notes"),
            confidence=float(s.get("confidence") or 0.0),
        )
        if not split.party_display_name:
            split.party_display_name = _closest_party(split.party_role, parties)
        else:
            mapped = _closest_party(split.party_display_name, parties)
            if mapped:
                split.party_display_name = mapped
        splits.append(split)

    works_hints = payload.get("works_hints") or {}
    terms = payload.get("terms") or {}

    v2 = ContractIntelV2(
        contract_title=(payload.get("contract_title") or filename.rsplit(".", 1)[0]).strip(),
        contract_type=payload.get("contract_type"),
        dates=dates,
        parties=parties,
        splits=splits,
        splits_total=round(sum(float(s.percent) for s in splits), 3),
        works_hints=ContractWorksHintsV2(
            artists=list(works_hints.get("artists") or []),
            tracks=list(works_hints.get("tracks") or []),
            releases=list(works_hints.get("releases") or []),
            works=list(works_hints.get("works") or []),
        ),
        terms=ContractTermsV2(
            grant_of_rights=terms.get("grant_of_rights"),
            territory=terms.get("territory"),
            exclusivity=terms.get("exclusivity"),
            term_summary=terms.get("term_summary"),
            renewal=terms.get("renewal"),
            reversion=terms.get("reversion"),
            governing_law=terms.get("governing_law"),
            delivery=terms.get("delivery"),
            royalty_basis=terms.get("royalty_basis"),
            notes=list(terms.get("notes") or []),
        ),
        parser_version="",
        raw_confidence=float(payload.get("raw_confidence") or 0.0),
        warnings=list(payload.get("warnings") or []),
    )

    if abs(v2.splits_total - 100.0) > 0.01 and v2.splits_total > 0:
        v2.warnings.append(f"splits_total_mismatch: {v2.splits_total}")
    if not v2.dates.end_date_specified:
        v2.warnings.append("no_end_date_specified")
    return v2


def v2_to_extraction(v2: ContractIntelV2) -> ContractExtractionV1:
    def _dateobj(raw: Optional[str]):
        if not raw:
            return None
        try:
            return datetime.strptime(raw, "%Y-%m-%d").date()
        except Exception:
            return None

    v1_parties = []
    for p in v2.parties:
        v1_parties.append(
            ContractPartyV1(
                display_name=p.display_name,
                role=p.role,
                confidence=p.confidence,
            )
        )

    v1_splits = []
    for s in v2.splits:
        split_type = SplitTypeV1.OTHER
        if s.scope.upper() == "MASTER":
            split_type = SplitTypeV1.MASTER
        elif s.scope.upper() == "PUBLISHING":
            split_type = SplitTypeV1.PUBLISHING
        v1_splits.append(
            ContractSplitV1(
                split_type=split_type,
                party_name=s.party_display_name or "Unknown party",
                party_role=s.party_role,
                percent=s.percent,
                notes=s.notes,
            )
        )

    return ContractExtractionV1(
        contract_title=v2.contract_title,
        contract_type=v2.contract_type,
        contract_date=_dateobj(v2.dates.contract_date),
        effective_date=_dateobj(v2.dates.effective_date),
        start_date=_dateobj(v2.dates.start_date or v2.dates.effective_date),
        end_date=_dateobj(v2.dates.end_date),
        expiration_date=_dateobj(v2.dates.expiration_date),
        territory=v2.terms.territory,
        parties=v1_parties,
        splits=v1_splits,
        splits_total=v2.splits_total,
        works_hints=WorksHintsV1(
            artists=v2.works_hints.artists,
            tracks=v2.works_hints.tracks,
            releases=v2.works_hints.releases,
        ),
        parser_version=v2.parser_version,
        raw_confidence=v2.raw_confidence,
        warnings=v2.warnings,
        dates=v2.dates,
        terms=v2.terms,
        key_terms=[
            {"key": "governing_law", "value": v2.terms.governing_law or "", "source": "llm"},
            {"key": "term_summary", "value": v2.terms.term_summary or "", "source": "llm"},
        ],
    )


def extract_contract_intelligence_llm_v1(text: str, filename: str, settings, org_id, user_id) -> ContractExtractionV1:
    trace_id = hashlib.sha256(f"{org_id}|{user_id}|{filename}".encode()).hexdigest()[:12]
    result = llm_extract_contract(text=text, filename=filename, settings=settings, trace_id=trace_id)
    v2 = _v2_from_json(result.get("json") or {}, filename=filename)
    v2.parser_version = f"llm_v1:{settings.AI_LLM_MODEL}"
    if not v2.raw_confidence:
        base = 0.4
        if v2.parties:
            base += 0.2
        if v2.splits:
            base += 0.2
        if v2.terms.governing_law or v2.terms.term_summary:
            base += 0.1
        v2.raw_confidence = min(base, 0.95)
    return v2_to_extraction(v2)
