from __future__ import annotations

from typing import List

from schemas.contracts_list import (
    ContractCompleteness,
    CompletenessReason,
    CompletenessSignals,
)


def compute_contract_completeness(
    documents_count: int,
    tracks_count: int,
    parties_count: int,
    territory: str | None,
    effective_date_present: bool,
    end_date_known: bool,
    term_present: bool,
) -> ContractCompleteness:
    """Deterministic completeness score. Pure function, no DB access."""
    score = 100
    reasons: List[CompletenessReason] = []

    def penalize(code, message, weight):
        nonlocal score
        score -= weight
        reasons.append(CompletenessReason(code=code, message=message, weight=weight))

    if documents_count <= 0:
        penalize("missing_documents", "No contract documents attached", 40)
    if tracks_count <= 0:
        penalize("missing_tracks", "No tracks linked", 30)
    if parties_count <= 0:
        penalize("missing_parties", "No parties linked", 30)

    if not territory:
        penalize("missing_territory", "Territory not set", 10)
    if not effective_date_present:
        penalize("missing_effective_date", "Effective date not set", 5)
    if not term_present:
        penalize("missing_term", "Term not set", 5)

    score = max(0, min(100, score))

    missing = [r.code for r in reasons]
    missing_required_bucket = ("missing_tracks" in missing) or ("missing_parties" in missing)
    if missing_required_bucket or score < 70:
        status_quo = "red"
    elif score == 100:
        status_quo = "green"
    else:
        status_quo = "amber"

    notes: List[str] = []
    if "missing_parties" in missing:
        notes.append("no_parties_linked")
    if "missing_tracks" in missing:
        notes.append("no_tracks_linked")
    if "missing_documents" in missing:
        notes.append("no_documents_attached")

    signals = CompletenessSignals(
        documents=documents_count,
        tracks=tracks_count,
        parties=parties_count,
        effective_date=effective_date_present,
        end_date_known=end_date_known,
        territory=bool(territory),
        term_present=term_present,
    )

    return ContractCompleteness(
        version="v1",
        score=score,
        status_quo=status_quo,
        color=status_quo,
        missing=missing,
        notes=notes,
        reasons=reasons,
        signals=signals,
    )
