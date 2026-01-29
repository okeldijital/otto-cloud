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
from routes.auth import get_current_active_user

router = APIRouter()

@router.get("/")
def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Global search across multiple entities"""
    results = {
        "artists": [],
        "releases": [],
        "tracks": [],
        "works": [],
        "contracts": []
    }
    
    search_term = f"%{q}%"
    
    # Search Artists
    artists = db.query(Artist).filter(
        or_(Artist.name.ilike(search_term), Artist.bio.ilike(search_term))
    ).limit(5).all()
    results["artists"] = [{"id": a.id, "name": a.name, "type": "artist"} for a in artists]
    
    # Search Releases
    releases = db.query(Release).filter(
        or_(Release.title.ilike(search_term), Release.upc_code.ilike(search_term))
    ).limit(5).all()
    results["releases"] = [{"id": r.id, "title": r.title, "type": "release"} for r in releases]
    
    # Search Tracks
    tracks = db.query(Track).filter(
        or_(Track.title.ilike(search_term), Track.isrc_code.ilike(search_term))
    ).limit(5).all()
    results["tracks"] = [{"id": t.id, "title": t.title, "type": "track", "release_id": t.release_id} for t in tracks]
    
    # Search Works
    works = db.query(Work).filter(
        or_(Work.title.ilike(search_term), Work.iswc_code.ilike(search_term))
    ).limit(5).all()
    results["works"] = [{"id": w.id, "title": w.title, "type": "work"} for w in works]
    
    # Search Contracts
    contracts = db.query(Contract).filter(
        or_(Contract.title.ilike(search_term), Contract.contract_id.ilike(search_term))
    ).limit(5).all()
    results["contracts"] = [{"id": c.id, "title": c.title, "type": "contract"} for c in contracts]
    
    return results
