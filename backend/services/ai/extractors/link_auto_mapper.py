"""
Auto-mapper: matches extracted party names and track titles against the org's
database. Returns suggestions with confidence scores.

Used by extract_bulk and extract (single) routes to pre-fill cards.
"""

import re
import uuid
from typing import Dict, List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from models.artist import Artist
from models.network import Individual, Organization
from models.track import Track
from schemas.ai_contracts_v2 import ContractExtractV2, PartyV2, TrackMentionV2


# ── Text normalization ────────────────────────────────────────────────

def _normalize(name: str) -> str:
    """Lowercase, strip, collapse whitespace, remove non-alphanumeric."""
    if not name:
        return ""
    n = name.lower().strip()
    n = re.sub(r"\s+", " ", n)
    return n


def _normalize_strict(name: str) -> str:
    """Normalized + remove all non-alphanumeric (for fuzzy matching)."""
    n = _normalize(name)
    return re.sub(r"[^a-z0-9\s]", "", n).strip()


# ── Matching helpers ──────────────────────────────────────────────────

def _token_overlap(a: str, b: str) -> float:
    """Jaccard-style token overlap score."""
    at = set(t for t in _normalize_strict(a).split() if t)
    bt = set(t for t in _normalize_strict(b).split() if t)
    if not at or not bt:
        return 0.0
    inter = at & bt
    denom = max(len(at), len(bt))
    return len(inter) / denom


def _match_score(query: str, candidate: str) -> Tuple[float, str]:
    """
    Compare query to candidate. Returns (confidence, strategy).
    Returns (0.0, "none") if no match.
    """
    q = _normalize(query)
    c = _normalize(candidate)
    if not q or not c:
        return 0.0, "none"

    # Exact (case-insensitive)
    if q == c:
        return 1.0, "exact"

    # Strict-normalized exact
    qs, cs = _normalize_strict(q), _normalize_strict(c)
    if qs and cs and qs == cs:
        return 0.95, "normalized"

    # Contains
    if len(qs) >= 3 and qs in cs:
        return 0.85, "contains"
    if len(cs) >= 3 and cs in qs:
        return 0.80, "contains"

    # Token overlap
    overlap = _token_overlap(q, c)
    if overlap >= 0.6:
        return round(0.5 + overlap * 0.3, 2), "token_overlap"

    # Prefix match (first 5+ chars)
    if len(qs) >= 5 and len(cs) >= 5 and qs[:5] == cs[:5]:
        return 0.55, "prefix"

    return 0.0, "none"


# ── Party matching ────────────────────────────────────────────────────

def _find_best_party(db: Session, org_id, name: str) -> Optional[Dict]:
    """Search Artists, Organizations, Individuals for the best match."""
    if not _normalize(name):
        return None

    best: Optional[Dict] = None
    best_score = 0.0

    # Search Artists (name, aka, legal_name)
    artists = (
        db.query(Artist)
        .filter(
            Artist.organization_id == org_id,
            or_(
                Artist.name.ilike(f"%{name}%"),
                Artist.aka.ilike(f"%{name}%"),
                Artist.legal_name.ilike(f"%{name}%"),
            ),
        )
        .limit(10)
        .all()
    )
    for a in artists:
        for field in [a.name, a.aka, a.legal_name]:
            if not field:
                continue
            score, strategy = _match_score(name, field)
            if score > best_score:
                best_score = score
                best = {
                    "entity_type": "artist",
                    "entity_id": a.id,
                    "display_name": a.name,
                    "confidence": score,
                    "strategy": strategy,
                }

    # Search Organizations
    orgs = (
        db.query(Organization)
        .filter(Organization.organization_id == org_id, Organization.name.ilike(f"%{name}%"))
        .limit(10)
        .all()
    )
    for o in orgs:
        score, strategy = _match_score(name, o.name)
        if score > best_score:
            best_score = score
            best = {
                "entity_type": "organization",
                "entity_id": o.id,
                "display_name": o.name,
                "confidence": score,
                "strategy": strategy,
            }

    # Search Individuals
    indivs = (
        db.query(Individual)
        .filter(
            Individual.organization_id == org_id,
            or_(
                Individual.first_name.ilike(f"%{name}%"),
                Individual.last_name.ilike(f"%{name}%"),
            ),
        )
        .limit(10)
        .all()
    )
    for ind in indivs:
        full = f"{ind.first_name or ''} {ind.last_name or ''}".strip()
        score, strategy = _match_score(name, full)
        if score > best_score:
            best_score = score
            best = {
                "entity_type": "individual",
                "entity_id": ind.id,
                "display_name": full,
                "confidence": score,
                "strategy": strategy,
            }

    return best


def match_parties(db: Session, org_id, parties: List[PartyV2]) -> List[Dict]:
    """Match extracted party names against the database."""
    results = []
    for p in parties:
        match = _find_best_party(db, org_id, p.display_name)
        if match and match["confidence"] >= 0.5:
            results.append({
                "display_name": match["display_name"],
                "entity_id": match["entity_id"],
                "entity_type": match["entity_type"],
                "role": p.role if p.role != "unknown" else "other",
                "confidence": match["confidence"],
                "strategy": match["strategy"],
                "extracted_name": p.display_name,
            })
        else:
            results.append({
                "display_name": p.display_name,
                "entity_id": None,
                "entity_type": "external",
                "role": p.role if p.role != "unknown" else "other",
                "confidence": 0.0,
                "strategy": "unmatched",
                "extracted_name": p.display_name,
            })
    return results


# ── Track matching ────────────────────────────────────────────────────

def match_tracks(db: Session, org_id, tracks_mentioned: List[TrackMentionV2]) -> List[Dict]:
    """Match extracted track titles against the database. Returns list with scores."""
    results = []

    for t in tracks_mentioned:
        title = _normalize(t.title)
        if not title:
            continue

        # Search candidates
        candidates = (
            db.query(Track)
            .filter(Track.organization_id == org_id, Track.title.ilike(f"%{title}%"))
            .limit(20)
            .all()
        )

        best_track = None
        best_score = 0.0
        best_strategy = "none"

        for track in candidates:
            score, strategy = _match_score(t.title, track.title)
            if score > best_score:
                best_score = score
                best_track = track
                best_strategy = strategy

        if best_track and best_score >= 0.5:
            results.append({
                "track_id": best_track.id,
                "title": best_track.title,
                "confidence": best_score,
                "strategy": best_strategy,
                "extracted_title": t.title,
            })
        else:
            results.append({
                "track_id": None,
                "title": t.title,
                "confidence": 0.0,
                "strategy": "unmatched",
                "extracted_title": t.title,
            })

    return results


# ── Public API ────────────────────────────────────────────────────────

def apply_auto_mapping_to_v2(db: Session, org_id, v2: ContractExtractV2) -> Dict:
    """
    Takes a V2 extraction and returns auto-mapped suggestions.
    Returns:
        {
            "party_links": [...],        # matched party suggestions
            "track_matches": [...],      # matched track suggestions (with scores)
            "track_ids": [int, ...],     # just the IDs of matched tracks (convenience)
        }
    """
    party_links = match_parties(db, org_id, v2.parties)
    track_matches = match_tracks(db, org_id, v2.tracks_mentioned)
    track_ids = sorted(set(m["track_id"] for m in track_matches if m["track_id"] is not None))

    return {
        "party_links": party_links,
        "track_matches": track_matches,
        "track_ids": track_ids,
    }
