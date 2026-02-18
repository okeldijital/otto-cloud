import json
from typing import Any, Dict, Optional

import httpx

from services.ai.llm.errors import LLMDisabledError, LLMParseError, LLMRequestError


def _base_url(settings) -> str:
    if settings.AI_LLM_API_BASE:
        return settings.AI_LLM_API_BASE.rstrip("/")
    return "https://api.openai.com"


def llm_extract_contract(
    text: str,
    filename: str,
    settings,
    trace_id: str,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
) -> Dict[str, Any]:
    if not settings.llm_extract_enabled():
        raise LLMDisabledError("llm_extract_disabled")

    bounded_text = (text or "")[: int(settings.AI_LLM_MAX_INPUT_CHARS)]
    url = f"{_base_url(settings)}/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.AI_LLM_API_KEY}",
        "Content-Type": "application/json",
    }
    system = system_prompt or (
        "You are a contract extraction engine. Return ONLY valid JSON and no markdown. "
        "Extract parties with roles, dates, splits with party attribution, key terms, and works hints."
    )
    user = user_prompt or (
        f"filename: {filename}\n"
        "Return JSON object fields: contract_title, contract_type, dates, parties, splits, works_hints, terms, raw_confidence, warnings.\n"
        f"contract_text:\n{bounded_text}"
    )

    payload: Dict[str, Any] = {
        "model": settings.AI_LLM_MODEL,
        "temperature": float(settings.AI_LLM_TEMPERATURE),
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    if settings.AI_LLM_FORCE_JSON:
        payload["response_format"] = {"type": "json_object"}

    try:
        with httpx.Client(timeout=float(settings.AI_LLM_TIMEOUT_S)) as client:
            resp = client.post(url, headers=headers, json=payload)
    except Exception as exc:
        raise LLMRequestError(f"llm_request_failed:{trace_id}") from exc

    if resp.status_code >= 400:
        raise LLMRequestError(f"llm_bad_status:{resp.status_code}:{trace_id}")

    try:
        data = resp.json()
    except Exception as exc:
        raise LLMParseError(f"llm_non_json_response:{trace_id}") from exc

    try:
        content = data["choices"][0]["message"]["content"]
    except Exception as exc:
        raise LLMParseError(f"llm_missing_content:{trace_id}") from exc

    if isinstance(content, dict):
        parsed = content
    else:
        try:
            parsed = json.loads(content)
        except Exception as exc:
            raise LLMParseError(f"llm_invalid_json:{trace_id}") from exc

    usage = data.get("usage") or {}
    return {
        "json": parsed,
        "usage": {
            "prompt_tokens": usage.get("prompt_tokens"),
            "completion_tokens": usage.get("completion_tokens"),
            "total_tokens": usage.get("total_tokens"),
        },
    }
