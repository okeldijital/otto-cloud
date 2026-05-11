from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any


from database import get_db
from models.user import User as UserModel
from models.artist import Artist
from models.release import Release
from models.track import Track
from models.work import Work
from models.contract import Contract
from models.label import Label
from models.publisher import Publisher
from models.pro import PRO
from models.document import Document
from models.note import Note
from models.playlist import Playlist
from dependencies import get_current_active_user
from models.network import Organization, Individual, Platform

router = APIRouter()

@router.get("")
def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Global search across multiple entities, scoped by organization_id"""
    try:
        results = {
            "artists": [],
            "releases": [],
            "tracks": [],
            "works": [],
            "contracts": [],
            "labels": [],
            "publishers": [],
            "pros": [],
            "documents": [],
            "notes": [],
            "playlists": [],
            "network": []
        }
        
        search_term = f"%{q}%"
        org_id = current_user.organization_id
        
        # Search Artists (Scoped)
        artists = db.query(Artist).filter(
            Artist.organization_id == org_id,
            or_(
                Artist.name.ilike(search_term),
                Artist.aka.ilike(search_term),
                Artist.artist_id.ilike(search_term)
            )
        ).limit(5).all()
        results["artists"] = [{"id": a.id, "name": a.name, "type": "artist"} for a in artists]
        
        # Search Releases (Scoped)
        releases = db.query(Release).filter(
            Release.organization_id == org_id,
            or_(
                Release.title.ilike(search_term), 
                Release.upc_code.ilike(search_term),
                Release.catalog_number.ilike(search_term),
                Release.release_id.ilike(search_term)
            )
        ).limit(5).all()
        results["releases"] = [{"id": r.id, "title": r.title, "type": "release"} for r in releases]
        
        # Search Tracks (Scoped)
        tracks = db.query(Track).filter(
            Track.organization_id == org_id,
            or_(
                Track.title.ilike(search_term), 
                Track.isrc_code.ilike(search_term),
                Track.track_id.ilike(search_term)
            )
        ).limit(5).all()
        results["tracks"] = [{"id": t.id, "title": t.title, "type": "track", "release_id": t.release_id} for t in tracks]
        
        # Search Works (Scoped)
        works = db.query(Work).filter(
            Work.organization_id == org_id,
            or_(
                Work.title.ilike(search_term), 
                Work.iswc_code.ilike(search_term),
                Work.work_id.ilike(search_term)
            )
        ).limit(5).all()
        results["works"] = [{"id": w.id, "title": w.title, "type": "work"} for w in works]
        
        # Search Contracts (Scoped)
        contracts = db.query(Contract).filter(
            Contract.organization_id == org_id,
            or_(
                Contract.title.ilike(search_term), 
                Contract.contract_number.ilike(search_term)
            )
        ).limit(5).all()
        results["contracts"] = [{"id": c.id, "title": c.title, "type": "contract"} for c in contracts]

        # Search Labels (Scoped)
        labels = db.query(Label).filter(
            Label.organization_id == org_id,
            or_(
                Label.name.ilike(search_term),
                Label.contact_person.ilike(search_term)
            )
        ).limit(5).all()
        results["labels"] = [{"id": l.id, "name": l.name, "type": "label"} for l in labels]

        # Search Publishers (Scoped)
        publishers = db.query(Publisher).filter(
            Publisher.organization_id == org_id,
            Publisher.name.ilike(search_term)
        ).limit(5).all()
        results["publishers"] = [{"id": p.id, "name": p.name, "type": "publisher"} for p in publishers]

        # Search PROs (Global)
        pros = db.query(PRO).filter(PRO.name.ilike(search_term)).limit(5).all()
        results["pros"] = [{"id": p.id, "name": p.name, "type": "pro"} for p in pros]

        # Search Documents (Scoped)
        documents = db.query(Document).filter(
            Document.organization_id == org_id,
            or_(
                Document.title.ilike(search_term),
                Document.description.ilike(search_term)
            )
        ).limit(5).all()
        results["documents"] = [{"id": d.id, "title": d.title, "type": "document"} for d in documents]

        # Search Notes (Scoped)
        notes = db.query(Note).filter(
            Note.organization_id == org_id,
            or_(
                Note.title.ilike(search_term),
                Note.content.ilike(search_term)
            )
        ).limit(5).all()
        results["notes"] = [{"id": n.id, "title": n.title, "type": "note"} for n in notes]

        # Search Playlists (Scoped)
        playlists = db.query(Playlist).filter(
            Playlist.organization_id == org_id,
            or_(
                Playlist.title.ilike(search_term),
                Playlist.description.ilike(search_term)
            )
        ).limit(5).all()
        results["playlists"] = [{"id": p.id, "title": p.title, "type": "playlist"} for p in playlists]
        
        # Search Network (Scoped)
        orgs = db.query(Organization).filter(
            Organization.organization_id == org_id,
            Organization.name.ilike(search_term)
        ).limit(5).all()
        
        individuals = db.query(Individual).filter(
            Individual.organization_id == org_id,
            (Individual.first_name.ilike(search_term) | Individual.last_name.ilike(search_term))
        ).limit(5).all()
        
        # Platforms are Global in this schema
        platforms = db.query(Platform).filter(Platform.name.ilike(search_term)).limit(5).all()

        network_results = []
        network_results.extend([{"id": o.id, "name": o.name, "type": "organization", "entity_type": "Network"} for o in orgs])
        network_results.extend([{"id": i.id, "name": i.full_name, "type": "individual", "entity_type": "Network"} for i in individuals])
        network_results.extend([{"id": p.id, "name": p.name, "type": "platform", "entity_type": "Network"} for p in platforms])
        
        results["network"] = network_results
        
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))
