import re
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from schemas.ai_contracts import ContractExtractionV1
from schemas.ai_linking import EntitySuggestion, ContractLinkSuggestResponseV1
from models.track import Track
from models.release import Release
from models.work import Work
from models.network import Individual, Organization 
from models.artist import Artist
from models.user import User # For org scope
import logging

def normalize_name(name: str) -> str:
    if not name:
        return ""
    # Lowercase
    n = name.lower()
    # Collapse whitespace
    n = re.sub(r'\s+', ' ', n).strip()
    # Remove common suffixes/prefixes (basic set)
    suffixes = [r'\bltd\b', r'\bpty\b', r'\bcc\b', r'\binc\b', r'\bllc\b', r'\brecords\b', r'\bmusic\b', r'\bproductions\b']
    for s in suffixes:
        n = re.sub(s, '', n)
    
    # Remove role annotations like (Remixer), [Artist]
    n = re.sub(r'\(.*?\)', '', n)
    n = re.sub(r'\[.*?\]', '', n)
    
    return n.strip()

def calculate_match_confidence(query_norm: str, candidate_norm: str) -> Tuple[float, str, str]:
    """Returns (confidence, strategy, rationale)"""
    if not query_norm or not candidate_norm:
        return 0.0, "none", "empty string"
        
    if query_norm == candidate_norm:
        return 0.95, "normalized", "Exact normalized match"
    
    if query_norm in candidate_norm:
        return 0.70, "contains", f"'{query_norm}' in '{candidate_norm}'"
        
    if candidate_norm in query_norm:
        return 0.70, "contains", f"'{candidate_norm}' in '{query_norm}'"
        
    # Token overlap
    q_tokens = set(query_norm.split())
    c_tokens = set(candidate_norm.split())
    overlap = q_tokens.intersection(c_tokens)
    if len(overlap) >= 2:
        return 0.60, "fuzzy", f"Token overlap: {overlap}"
        
    return 0.0, "none", "no match"

def suggest_links(db: Session, org_id: str, extraction: ContractExtractionV1) -> ContractLinkSuggestResponseV1:
    """
    Deterministic linker service (V1).
    Read-only queries to find candidates for parsed entities.
    """
    suggestions = {
        "artists": [],
        "parties": [],
        "tracks": [],
        "works": [],
        "organizations": []
    }
    
    # helper to add suggestion
    def add_suggestion(category: str, sugg: EntitySuggestion):
        # check duplicate
        for existing in suggestions[category]:
            if existing.entity_id == sugg.entity_id:
                if sugg.confidence > existing.confidence:
                    existing.confidence = sugg.confidence
                    existing.match_strategy = sugg.match_strategy
                    existing.rationale = sugg.rationale
                return
        suggestions[category].append(sugg)

    # 1. Parties Matching (Person/Organization/Artist)
    for party in extraction.parties:
        raw_name = party.display_name
        norm_name = normalize_name(raw_name)
        if not norm_name: continue
        
        # Search Artists (Scoped)
        # Note: org_id in DB is usually UUID, so we format it properly if needed.
        # But here org_id is passed as str. SQLAlchemy SafeUuid might handle str or need UUID obj.
        # We rely on previous patterns. In test_ai link suggest, we see UUID usage.
        
        # Search Artists (Scoped)
        artists = db.query(Artist).filter(Artist.organization_id == org_id).all()
        for a in artists:
            a_norm = normalize_name(a.name) # or display_name
            conf, strat, rat = calculate_match_confidence(norm_name, a_norm)
            if conf > 0.5:
                sugg = EntitySuggestion(
                    entity_type="artist",
                    entity_id=str(a.id),
                    display_name=a.name,
                    confidence=conf,
                    match_strategy=strat,
                    rationale=rat,
                    fields_matched=["name"]
                )
                add_suggestion("artists", sugg)

        # Search Individuals (Global in current schema)
        persons = db.query(Individual).all()
        for p in persons:
            p_norm = normalize_name(f"{p.first_name} {p.last_name}")
            conf, strat, rat = calculate_match_confidence(norm_name, p_norm)
            if conf > 0.5:
                sugg = EntitySuggestion(
                    entity_type="person",
                    entity_id=str(p.id),
                    display_name=f"{p.first_name} {p.last_name}",
                    confidence=conf,
                    match_strategy=strat,
                    rationale=rat,
                    fields_matched=["name"]
                )
                add_suggestion("parties", sugg)
                
        # Search Organizations (Global in current schema)
        orgs = db.query(Organization).all()
        for o in orgs:
            o_norm = normalize_name(o.name)
            conf, strat, rat = calculate_match_confidence(norm_name, o_norm)
            if conf > 0.5:
                sugg = EntitySuggestion(
                    entity_type="organization",
                    entity_id=str(o.id),
                    display_name=o.name,
                    confidence=conf,
                    match_strategy=strat,
                    rationale=rat,
                    fields_matched=["name"]
                )
                add_suggestion("parties", sugg) # Party can be person or org

    # 2. Works/Tracks Hints
    hints = extraction.works_hints
    
    # Tracks Matching (Scoped)
    if hints.tracks:
        all_tracks = db.query(Track).filter(Track.organization_id == org_id).all()
        for track_hint in hints.tracks:
            t_norm_hint = normalize_name(track_hint)
            for t in all_tracks:
                t_norm = normalize_name(t.title)
                conf, strat, rat = calculate_match_confidence(t_norm_hint, t_norm)
                if conf > 0.5:
                    sugg = EntitySuggestion(
                        entity_type="track",
                        entity_id=str(t.id),
                        display_name=t.title,
                        confidence=conf,
                        match_strategy=strat,
                        rationale=rat,
                        fields_matched=["title"]
                    )
                    add_suggestion("tracks", sugg)

    # Sort suggestions by confidence desc
    for key in suggestions:
        suggestions[key].sort(key=lambda x: x.confidence, reverse=True)
        suggestions[key] = suggestions[key][:5]

    return ContractLinkSuggestResponseV1(
        org_id=str(org_id),
        suggestions=suggestions,
        warnings=[],
        needs_review=True
    )
