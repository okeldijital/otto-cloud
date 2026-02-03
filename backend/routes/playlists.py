from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from models.playlist import Playlist as PlaylistModel
from schemas.playlist import Playlist, PlaylistCreate, PlaylistUpdate
from dependencies import get_current_active_user
from utils.activity import log_activity

router = APIRouter()


@router.get("", response_model=List[Playlist])
def list_playlists(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all playlists"""
    playlists = db.query(PlaylistModel).offset(skip).limit(limit).all()
    return playlists


@router.post("", response_model=Playlist, status_code=status.HTTP_201_CREATED)
def create_playlist(
    playlist: PlaylistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new playlist"""
    db_playlist = PlaylistModel(**playlist.model_dump())
    db.add(db_playlist)
    db.commit()
    db.refresh(db_playlist)
    
    log_activity(db, current_user.id, "created", "playlist", db_playlist.id, db_playlist.name)
    
    return db_playlist


@router.get("/{playlist_id}", response_model=Playlist)
def get_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific playlist by ID"""
    playlist = db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return playlist


@router.put("/{playlist_id}", response_model=Playlist)
def update_playlist(
    playlist_id: int,
    playlist_update: PlaylistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a playlist"""
    db_playlist = db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
    if not db_playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    update_data = playlist_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_playlist, field, value)
    
    db.commit()
    db.refresh(db_playlist)
    
    log_activity(db, current_user.id, "updated", "playlist", db_playlist.id, db_playlist.name)
    
    return db_playlist


@router.delete("/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a playlist"""
    db_playlist = db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
    if not db_playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    playlist_name = db_playlist.name
    db.delete(db_playlist)
    db.commit()
    
    log_activity(db, current_user.id, "deleted", "playlist", playlist_id, playlist_name)
    
    return None
