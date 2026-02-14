from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from uuid import UUID
from models.artist import Artist
from models.track import Track
from models.work import Work
from models.release import Release
from models.network import Individual, Organization
from schemas.ai import AIResultItem


def search_catalog(
    db: Session,
    org_id: UUID,
    query: str,
    limit: int = 10
) -> List[AIResultItem]:
    """
    Search catalog (artists, tracks, works, releases).
    Read-only, org-scoped.
    """
    results = []
    search_term = f"%{query}%"
    
    # Search Artists
    artists = db.query(Artist).filter(
        Artist.organization_id == org_id,
        Artist.name.ilike(search_term)
    ).limit(limit).all()
    
    for artist in artists:
        results.append(AIResultItem(
            type="artist",
            id=artist.id,
            label=artist.name,
            metadata={"stage_name": artist.stage_name}
        ))
    
    # Search Tracks
    tracks = db.query(Track).filter(
        Track.organization_id == org_id,
        Track.title.ilike(search_term)
    ).limit(limit).all()
    
    for track in tracks:
        results.append(AIResultItem(
            type="track",
            id=track.id,
            label=track.title,
            metadata={"isrc": track.isrc}
        ))
    
    # Search Works
    works = db.query(Work).filter(
        Work.organization_id == org_id,
        Work.title.ilike(search_term)
    ).limit(limit).all()
    
    for work in works:
        results.append(AIResultItem(
            type="work",
            id=work.id,
            label=work.title,
            metadata={"iswc": work.iswc}
        ))
    
    # Search Releases
    releases = db.query(Release).filter(
        Release.organization_id == org_id,
        Release.title.ilike(search_term)
    ).limit(limit).all()
    
    for release in releases:
        results.append(AIResultItem(
            type="release",
            id=release.id,
            label=release.title,
            metadata={"upc": release.upc}
        ))
    
    return results[:limit]


def search_network(
    db: Session,
    org_id: UUID,
    query: str,
    limit: int = 10
) -> List[AIResultItem]:
    """
    Search network (individuals, organizations).
    Read-only, org-scoped.
    """
    results = []
    search_term = f"%{query}%"
    
    # Search Individuals
    individuals = db.query(Individual).filter(
        Individual.organization_id == org_id,
        or_(
            Individual.first_name.ilike(search_term),
            Individual.last_name.ilike(search_term),
            Individual.email.ilike(search_term)
        )
    ).limit(limit).all()
    
    for individual in individuals:
        full_name = f"{individual.first_name or ''} {individual.last_name or ''}".strip()
        results.append(AIResultItem(
            type="individual",
            id=individual.id,
            label=full_name or individual.email or "Unknown",
            metadata={"email": individual.email}
        ))
    
    # Search Organizations
    organizations = db.query(Organization).filter(
        Organization.organization_id == org_id,
        Organization.name.ilike(search_term)
    ).limit(limit).all()
    
    for org in organizations:
        results.append(AIResultItem(
            type="organization",
            id=org.id,
            label=org.name,
            metadata={"entity_type": org.entity_type}
        ))
    
    return results[:limit]


def get_help_tips() -> List[AIResultItem]:
    """
    Return static help tips.
    No database access required.
    """
    tips = [
        {
            "type": "tip",
            "id": 1,
            "label": "Search Catalog",
            "metadata": {
                "description": "Use 'find:' prefix to search artists, tracks, works, and releases",
                "example": "find: midnight groove"
            }
        },
        {
            "type": "tip",
            "id": 2,
            "label": "Search Network",
            "metadata": {
                "description": "Search for individuals and organizations in your network",
                "example": "find: john smith"
            }
        },
        {
            "type": "tip",
            "id": 3,
            "label": "AI Assistant",
            "metadata": {
                "description": "Ask questions about your catalog and network",
                "example": "What can you help me with?"
            }
        }
    ]
    
    return [AIResultItem(**tip) for tip in tips]
