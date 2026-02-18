import re
import uuid
from typing import Callable, Optional, Tuple

from sqlalchemy.orm import Session

from models.artist import Artist
from models.network import Individual, Organization
from models.release import Release
from models.track import Track
from models.work import Work
from schemas.ai_release_mapping import (
    ArtistMatch,
    IndividualMatch,
    MapMatches,
    MapMissing,
    MatchedEntityRef,
    MatchStrategy,
    OrganizationMatch,
    ReleaseMapPlanResponse,
    TrackMatch,
    WorkMatch,
)


_ALLOWED_FLAGS = {
    "missing_artwork",
    "missing_tracks",
    "missing_works",
    "metadata_mismatch",
    "splits_total_mismatch",
}

_ARTIST_ROLE_TOKENS = {"artist", "remixer", "producer", "dj"}
_ORG_ROLE_TOKENS = {"label", "publisher", "organization", "company"}
_INDIVIDUAL_ROLE_TOKENS = {"individual", "person", "composer", "writer", "author"}


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


def _match_strategy(query: str, candidate: str) -> Tuple[Optional[float], Optional[MatchStrategy]]:
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


def _pick_best(query: str, rows: list, name_fn: Callable) -> Tuple[Optional[object], Optional[float], Optional[MatchStrategy]]:
    best = None
    best_conf = None
    best_strat = None
    for row in rows:
        label = name_fn(row)
        conf, strat = _match_strategy(query, label)
        if conf is None or strat is None:
            continue
        if best_conf is None or conf > best_conf:
            best = row
            best_conf = conf
            best_strat = strat
    return best, best_conf, best_strat


def _individual_name(ind: Individual) -> str:
    return f"{(ind.first_name or '').strip()} {(ind.last_name or '').strip()}".strip()


def _coerce_release_flags(release: Release, extract_warnings: list[str]) -> list[str]:
    flags = []
    if not (release.cover_art_url or "").strip():
        flags.append("missing_artwork")
    if "missing_tracks" in extract_warnings:
        flags.append("missing_tracks")
    if "tracks_missing" in extract_warnings:
        flags.append("missing_tracks")
    if "terms_missing" in extract_warnings:
        flags.append("metadata_mismatch")
    if any("splits_total_mismatch" in (w or "") for w in extract_warnings):
        flags.append("splits_total_mismatch")

    deduped = []
    seen = {}
    for f in flags:
        if f in _ALLOWED_FLAGS and f not in seen:
            deduped.append(f)
            seen[f] = True
    return deduped


def _party_source_bucket(role: Optional[str]) -> Optional[str]:
    role_norm = _normalize_name(role or "")
    if not role_norm:
        return None
    tokens = set(role_norm.split(" "))
    if tokens.intersection(_ARTIST_ROLE_TOKENS):
        return "artist"
    if tokens.intersection(_ORG_ROLE_TOKENS):
        return "organization"
    if tokens.intersection(_INDIVIDUAL_ROLE_TOKENS):
        return "individual"
    return None


def build_release_map_plan(
    db: Session,
    org_id: uuid.UUID,
    release_id: int,
    extract_v2,
) -> ReleaseMapPlanResponse:
    release = (
        db.query(Release)
        .filter(Release.id == release_id, Release.organization_id == org_id)
        .first()
    )
    if not release:
        raise ValueError("release_not_found")

    artists = db.query(Artist).filter(Artist.organization_id == org_id).all()
    organizations = db.query(Organization).filter(Organization.organization_id == org_id).all()
    individuals = db.query(Individual).filter(Individual.organization_id == org_id).all()
    tracks = db.query(Track).filter(Track.organization_id == org_id).all()
    works = db.query(Work).filter(Work.organization_id == org_id).all()

    matches = MapMatches()
    missing = MapMissing()

    for party in (extract_v2.parties or []):
        q = party.display_name
        source_bucket = _party_source_bucket(getattr(party, "role", None))

        if source_bucket == "artist":
            best_artist, conf_a, strat_a = _pick_best(q, artists, lambda r: r.name)
            if best_artist is not None and conf_a is not None and strat_a is not None:
                matches.artists.append(
                    ArtistMatch(
                        extract_name=q,
                        matched_entity=MatchedEntityRef(
                            entity_type="artist",
                            id=best_artist.id,
                            display_name=best_artist.name,
                        ),
                        confidence=float(conf_a),
                        strategy=strat_a,
                    )
                )
            else:
                missing.artists.append(q)

        elif source_bucket == "organization":
            best_org, conf_o, strat_o = _pick_best(q, organizations, lambda r: r.name)
            if best_org is not None and conf_o is not None and strat_o is not None:
                matches.organizations.append(
                    OrganizationMatch(
                        extract_name=q,
                        matched_entity=MatchedEntityRef(
                            entity_type="organization",
                            id=best_org.id,
                            display_name=best_org.name,
                        ),
                        confidence=float(conf_o),
                        strategy=strat_o,
                    )
                )
            else:
                missing.organizations.append(q)

        elif source_bucket == "individual":
            best_ind, conf_i, strat_i = _pick_best(q, individuals, _individual_name)
            if best_ind is not None and conf_i is not None and strat_i is not None:
                matches.individuals.append(
                    IndividualMatch(
                        extract_name=q,
                        matched_entity=MatchedEntityRef(
                            entity_type="individual",
                            id=best_ind.id,
                            display_name=_individual_name(best_ind),
                        ),
                        confidence=float(conf_i),
                        strategy=strat_i,
                    )
                )
            else:
                missing.individuals.append(q)

    # Convert v2 tracks to strings and try both track/work mapping.
    for entry in (extract_v2.tracks or []):
        q_title = entry.title
        best_track, conf_t, strat_t = _pick_best(q_title, tracks, lambda r: r.title)
        if best_track is not None and conf_t is not None and strat_t is not None:
            matches.tracks.append(
                TrackMatch(
                    extract_title=q_title,
                    matched_entity=MatchedEntityRef(
                        entity_type="track",
                        id=best_track.id,
                        display_name=best_track.title,
                    ),
                    confidence=float(conf_t),
                    strategy=strat_t,
                )
            )
        else:
            missing.tracks.append(q_title)

        best_work, conf_w, strat_w = _pick_best(q_title, works, lambda r: r.title)
        if best_work is not None and conf_w is not None and strat_w is not None:
            matches.works.append(
                WorkMatch(
                    extract_title=q_title,
                    matched_entity=MatchedEntityRef(
                        entity_type="work",
                        id=best_work.id,
                        display_name=best_work.title,
                    ),
                    confidence=float(conf_w),
                    strategy=strat_w,
                )
            )
        else:
            missing.works.append(q_title)

    # Split-party binding warning support.
    split_party_warnings = []
    for split in (extract_v2.splits or []):
        if not (split.party_display_name or "").strip():
            split_party_warnings.append("unbound_split_party")

    notes = list(extract_v2.warnings or []) + split_party_warnings
    flags = _coerce_release_flags(release, notes)

    # Deduplicate missing values while preserving order.
    for key in ["artists", "organizations", "individuals", "tracks", "works"]:
        arr = getattr(missing, key)
        seen = {}
        deduped = []
        for item in arr:
            val = (item or "").strip()
            if not val:
                continue
            if val not in seen:
                deduped.append(val)
                seen[val] = True
        setattr(missing, key, deduped)

    needs_review = bool(flags) or bool(missing.artists or missing.organizations or missing.individuals or missing.tracks or missing.works)

    return ReleaseMapPlanResponse(
        org_id=str(org_id),
        release={"id": release.id, "title": release.title},
        matches=matches,
        missing=missing,
        release_validation_flags=flags,
        notes=notes,
        needs_review=needs_review,
    )
