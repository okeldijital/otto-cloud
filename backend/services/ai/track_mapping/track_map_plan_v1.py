import re
import uuid
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from models.artist import Artist
from models.track import Track
from schemas.ai_track_mapping import (
    TrackCandidateBundle,
    TrackCandidateMatch,
    TrackMapPlanResponse,
    TrackMapPlanRequest,
    TrackRef,
)


def _normalize_name(name: str) -> str:
    if not name:
        return ""
    n = name.lower().strip()
    n = re.sub(r"\s+", " ", n)
    n = re.sub(r"[^a-z0-9\s]", "", n)
    return n.strip()


def _token_overlap(a: str, b: str) -> float:
    at = set([t for t in _normalize_name(a).split(" ") if t])
    bt = set([t for t in _normalize_name(b).split(" ") if t])
    if not at or not bt:
        return 0.0
    inter = at.intersection(bt)
    denom = max(len(at), len(bt))
    return len(inter) / float(denom)


def _heuristic_partial(a: str, b: str) -> bool:
    an = _normalize_name(a)
    bn = _normalize_name(b)
    if not an or not bn:
        return False
    a0 = an.split(" ")[0] if an.split(" ") else ""
    b0 = bn.split(" ")[0] if bn.split(" ") else ""
    if len(a0) >= 4 and len(b0) >= 4 and (a0.startswith(b0[:4]) or b0.startswith(a0[:4])):
        return True
    return an[:6] == bn[:6] if min(len(an), len(bn)) >= 6 else False


def _match_strategy(query: str, candidate: str) -> Tuple[Optional[float], Optional[str]]:
    q = (query or "").strip()
    c = (candidate or "").strip()
    if not q or not c:
        return None, None

    if q == c:
        return 1.0, "exact"

    qn, cn = _normalize_name(q), _normalize_name(c)
    if qn and cn and qn == cn:
        return 0.96, "normalized_exact"

    if len(qn) >= 4 and qn in cn:
        return 0.84, "contains"
    if len(cn) >= 4 and cn in qn:
        return 0.82, "contains"

    overlap = _token_overlap(q, c)
    if overlap >= 0.6:
        return min(0.8, 0.6 + (overlap * 0.2)), "token_overlap"

    if _heuristic_partial(q, c):
        return 0.62, "heuristic_partial"

    return None, None


def _build_artist_map(db: Session, org_id: uuid.UUID) -> dict[int, str]:
    rows = db.query(Artist).filter(Artist.organization_id == org_id).all()
    out = {}
    for row in rows:
        out[row.id] = row.name
    return out


def build_track_map_plan(db: Session, org_id: uuid.UUID, req: TrackMapPlanRequest) -> TrackMapPlanResponse:
    query = db.query(Track).filter(Track.organization_id == org_id)
    if req.track_ids_hint:
        query = query.filter(Track.id.in_(req.track_ids_hint))
    tracks = query.all()

    # fall back to full org-scoped set when hints are empty or too restrictive
    if not tracks:
        tracks = db.query(Track).filter(Track.organization_id == org_id).all()

    artist_names = _build_artist_map(db, org_id)

    candidates = []
    missing = []
    notes = []

    max_results = max(1, int(req.max_results or 20))

    for extract_track in req.contract_extract_v2.tracks:
        raw = (extract_track.raw_mention or "").strip()
        normalized = (extract_track.normalized_title or "").strip()
        query_text = normalized or raw

        matches = []
        for track in tracks:
            conf, strategy = _match_strategy(query_text, track.title)
            if conf is None or strategy is None:
                continue
            matches.append(
                TrackCandidateMatch(
                    track=TrackRef(
                        id=track.id,
                        title=track.title,
                        artist_display=artist_names.get(getattr(track, "artist_id", None)),
                    ),
                    confidence=float(conf),
                    strategy=strategy,
                )
            )

        matches = sorted(matches, key=lambda m: m.confidence, reverse=True)[:max_results]

        if not matches:
            missing.append(raw or normalized or "unknown_track")

        candidates.append(
            TrackCandidateBundle(
                extract_track=extract_track,
                matches=matches,
                needs_review=True,
            )
        )

    if missing:
        notes.append("tracks_missing")

    return TrackMapPlanResponse(
        status="ok",
        org_id=str(org_id),
        mapping_version="track_map_v1",
        candidates=candidates,
        missing_tracks=missing,
        notes=notes,
        release_validation_flags=[],
    )
