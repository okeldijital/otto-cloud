from __future__ import annotations

import hashlib
from datetime import date, datetime
from typing import Any, Dict, Optional

from pydantic import ValidationError

from schemas.ai_contracts_v2 import ContractExtractV2
from services.ai.extractors.contract_extractor_deterministic_v2 import deterministic_extract_v2
from services.ai.extractors.validators.contract_extract_validator_v2 import validate_contract_extract_v2
from services.ai.llm.client import llm_extract_contract
from services.ai.llm.contract_prompt_v2 import (
    contract_extract_system_prompt_v2,
    contract_extract_user_prompt_v2,
)
from services.ai.llm.errors import LLMDisabledError, LLMParseError, LLMRequestError


class HybridExtractError(Exception):
    pass


def _to_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    raw = str(value).strip()
    if not raw:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except Exception:
            continue
    return None


def _normalize_payload(payload: Dict[str, Any], filename: str, file_sha256: str, page_count: Optional[int]) -> Dict[str, Any]:
    normalized = dict(payload or {})
    normalized["contract_title"] = normalized.get("contract_title") or filename.rsplit(".", 1)[0]
    normalized["parser_version"] = normalized.get("parser_version") or "llm_v2"
    normalized["raw_confidence"] = float(normalized.get("raw_confidence") or 0.0)
    normalized["warnings"] = list(normalized.get("warnings") or [])
    normalized["errors"] = list(normalized.get("errors") or [])
    normalized["effective_date"] = _to_date(normalized.get("effective_date"))
    normalized["start_date"] = _to_date(normalized.get("start_date"))
    normalized["end_date"] = _to_date(normalized.get("end_date"))
    if normalized["end_date"] is None and not normalized.get("end_date_note"):
        normalized["end_date_note"] = "no end date specified"

    source = dict(normalized.get("source") or {})
    source["filename"] = source.get("filename") or filename
    source["file_sha256"] = source.get("file_sha256") or file_sha256
    source["page_count"] = source.get("page_count") or page_count
    normalized["source"] = source
    return normalized


def _map_split_party_refs(v2: ContractExtractV2) -> None:
    party_index = {}
    for idx, party in enumerate(v2.parties):
        party_index[party.display_name.strip().lower()] = idx

    for split in v2.splits:
        if split.party_ref is not None:
            continue
        if split.party_name:
            mapped = party_index.get(split.party_name.strip().lower())
            if mapped is not None:
                split.party_ref = mapped


def extract_contract_v2_hybrid(
    *,
    text: str,
    filename: str,
    file_sha256: str,
    page_count: Optional[int],
    settings,
    org_id,
    user_id,
) -> ContractExtractV2:
    # Deterministic fallback is always available.
    fallback = deterministic_extract_v2(
        text=text,
        filename=filename,
        file_sha256=file_sha256,
        page_count=page_count,
    )

    if not (settings.AI_CONTRACT_EXTRACT_V2_ENABLED and settings.llm_extract_enabled()):
        if not settings.llm_extract_enabled():
            fallback.warnings = list(fallback.warnings or []) + ["llm_disabled_fallback"]
        return validate_contract_extract_v2(fallback)

    trace_id = hashlib.sha256(f"{org_id}|{user_id}|{filename}".encode()).hexdigest()[:12]

    try:
        llm_result = llm_extract_contract(
            text=text,
            filename=filename,
            settings=settings,
            trace_id=trace_id,
            system_prompt=contract_extract_system_prompt_v2(),
            user_prompt=contract_extract_user_prompt_v2(filename=filename, text=text[: settings.AI_LLM_MAX_INPUT_CHARS]),
        )
        payload = _normalize_payload(
            llm_result.get("json") or {},
            filename=filename,
            file_sha256=file_sha256,
            page_count=page_count,
        )
        v2 = ContractExtractV2.model_validate(payload)
        _map_split_party_refs(v2)
        v2.parser_version = f"llm_v2:{settings.AI_LLM_MODEL}"
        return validate_contract_extract_v2(v2)
    except (LLMDisabledError, LLMRequestError, LLMParseError, ValidationError):
        fallback.warnings = list(fallback.warnings or []) + ["llm_failed_fallback_deterministic"]
        return validate_contract_extract_v2(fallback)
    except Exception as exc:
        raise HybridExtractError(str(exc)) from exc
