from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Annotated

from database import get_db
from models.user import User
from models.artist import Artist as ArtistModel
from models.release import Release as ReleaseModel
from models.track import Track as TrackModel
from models.work import Work as WorkModel
from models.label import Label as LabelModel
from models.publisher import Publisher as PublisherModel
from models.pro import PRO as PROModel
from schemas.artist import Artist, ArtistCreate, ArtistUpdate
from schemas.release import Release, ReleaseCreate, ReleaseUpdate
from schemas.track import Track, TrackCreate, TrackUpdate
from schemas.work import Work, WorkCreate, WorkUpdate
from schemas.label import Label, LabelCreate, LabelUpdate
from schemas.publisher import Publisher, PublisherCreate, PublisherUpdate
from schemas.pro import PRO, PROCreate, PROUpdate
from dependencies import get_current_active_user, get_current_organization_id
from repositories.track_repository import track_repository
from utils.audit import audit_service
from sqlalchemy.exc import IntegrityError

router = APIRouter()


from models.contract import ContractAsset, ContractParty
from services.status_quo import compute_release_status

# ==================== ARTISTS ====================

@router.get("/artists", response_model=List[Artist])
def list_artists(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all artists"""
    artists = db.query(ArtistModel).offset(skip).limit(limit).all()
    return artists


@router.post("/artists", response_model=Artist, status_code=status.HTTP_201_CREATED)
def create_artist(
    artist: ArtistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new artist"""
    # Check for existing artist with same name
    existing = db.query(ArtistModel).filter(ArtistModel.name == artist.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An artist with the name '{artist.name}' already exists."
        )

    try:
        db_artist = ArtistModel(**artist.model_dump())
        db.add(db_artist)
        db.commit()
        db.refresh(db_artist)
        return db_artist
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A database integrity error occurred. This artist name or ID might already exist."
        )


@router.get("/artists/{artist_id}", response_model=Artist)
def get_artist(
    artist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific artist by ID"""
    artist = db.query(ArtistModel).filter(ArtistModel.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    return artist


@router.put("/artists/{artist_id}", response_model=Artist)
def update_artist(
    artist_id: int,
    artist_update: ArtistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an artist"""
    db_artist = db.query(ArtistModel).filter(ArtistModel.id == artist_id).first()
    if not db_artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    
    update_data = artist_update.model_dump(exclude_unset=True)
    
    # Check for duplicate name if name is being updated
    if "name" in update_data and update_data["name"] != db_artist.name:
        existing = db.query(ArtistModel).filter(ArtistModel.name == update_data["name"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An artist with the name '{update_data['name']}' already exists."
            )

    try:
        for field, value in update_data.items():
            setattr(db_artist, field, value)
        
        db.commit()
        db.refresh(db_artist)
        return db_artist
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A database integrity error occurred. This artist name or ID might already be in use."
        )


@router.delete("/artists/{artist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_artist(
    artist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an artist"""
    db_artist = db.query(ArtistModel).filter(ArtistModel.id == artist_id).first()
    if not db_artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    
    from sqlalchemy.exc import IntegrityError
    try:
        db.delete(db_artist)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete artist because they are linked to releases, tracks, or contracts. Please remove these links first."
        )
    return None


@router.get("/artists/{artist_id}/releases", response_model=List[Release])
def get_artist_releases(
    artist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all releases for a specific artist"""
    # Check both primary artist_id and the artist_ids JSON list
    from sqlalchemy import or_, func
    releases = db.query(ReleaseModel).filter(
        or_(
            ReleaseModel.artist_id == artist_id,
            # This is a bit tricky with SQLite JSON, but we can use JSON_EACH or similar if available
            # For simplicity and portability across typical setups:
            func.json_extract(func.coalesce(ReleaseModel.artist_ids, '[]'), '$').contains(artist_id)
        )
    ).all()
    # Fallback for simpler search if json_extract is not happy with the above
    if not releases:
        all_releases = db.query(ReleaseModel).all()
        releases = [r for r in all_releases if (r.artist_id == artist_id or (r.artist_ids and artist_id in r.artist_ids))]
    
    return releases


@router.get("/artists/{artist_id}/works", response_model=List[Work])
def get_artist_works(
    artist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all works associated with a specific artist/composer/arranger"""
    from sqlalchemy import func
    works = db.query(WorkModel).filter(
        # Check if artist_id is in composers or arrangers JSON array
        (func.json_extract(func.coalesce(WorkModel.composers, '[]'), '$').contains(artist_id)) |
        (func.json_extract(func.coalesce(WorkModel.arrangers, '[]'), '$').contains(artist_id))
    ).all()
    
    # Fallback for SQLite if json_extract doesn't behave as expected in all environments
    if not works:
        all_works = db.query(WorkModel).all()
        works = [w for w in all_works if (
            (w.composers and artist_id in w.composers) or 
            (w.arrangers and artist_id in w.arrangers)
        )]
    return works




# ==================== RELEASES ====================

@router.get("/releases", response_model=List[Release])
def list_releases(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all releases"""
    releases = db.query(ReleaseModel).offset(skip).limit(limit).all()
    
    # Enrich with status_quo
    # Optimization: Fetch basic boolean checks. 
    # For now, simplistic loop to ensure correctness.
    for r in releases:
        tracks = db.query(TrackModel).filter(TrackModel.release_id == r.id).all()
        # Check Contract Link (Asset)
        has_contract = db.query(ContractAsset).filter(
            ContractAsset.asset_type == 'Release',
            ContractAsset.asset_id == r.id
        ).first() is not None
        
        # Check Artist Link (Party)
        # Note: r.artist_id is primary. r.artist_ids might be multiple. 
        # Requirement: "Release Artist not linked to any Contract"
        # We check if THE primary artist is in any contract? Or if ANY contract linked to THIS release has THIS artist?
        # User phrasing: "Artist not linked to Contract" usually means "Artist attached to this Release has a contractcovering them".
        # Let's interpret as: Is the Release's Primary Artist a Party on ANY Contract?
        # Or more strictly: Is the Release's Primary Artist a Party on a Contract that also covers this Release?
        # Given "Release not linked to any Contract" is separate rule, let's assume this means "Does the Artist have a contract generally?" or "Is the Artist party to the same contract?"
        # Let's go with: Is the Artist a Party on the contract that covers the Release?
        # If no contract covers the release, then both fail.
        # If contract covers release, usually Artist is party.
        # Let's separate it simpler: Is the Artist linked to ANY contract? (General artist health)
        # OR: Is the Artist linked to a contract that THIS RELEASE is linked to?
        # Let's check if the Artist is a Party in ANY Contract for now (Simpler "Artist has contract" check).
        # Actually, best interpretation of "Release Artist not linked to any Contract" in context of Release Status:
        # "The Artist of this Release does not have a Contract".
        has_artist_contract = False
        if r.artist_id:
             has_artist_contract = db.query(ContractParty).filter(
                 ContractParty.entity_type == 'Artist',
                 ContractParty.entity_id == r.artist_id
             ).first() is not None

        r.status_quo = compute_release_status(r, tracks, has_contract, has_artist_contract)

    return releases


@router.post("/releases", response_model=Release, status_code=status.HTTP_201_CREATED)
def create_release(
    release: ReleaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new release"""
    # Check for existing release with same title
    existing = db.query(ReleaseModel).filter(ReleaseModel.title == release.title).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A release with the title '{release.title}' already exists."
        )

    try:
        track_ids = release.track_ids
        release_data = release.model_dump(exclude={"track_ids"})
        db_release = ReleaseModel(**release_data)
        db.add(db_release)
        db.commit()
        db.refresh(db_release)
        
        if track_ids:
            db.query(TrackModel).filter(TrackModel.id.in_(track_ids)).update({"release_id": db_release.id}, synchronize_session=False)
            db.commit()
            db.refresh(db_release)
            
        return db_release
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A release with this Title, Catalog Number, or UPC already exists."
        )


@router.get("/releases/{release_id}", response_model=Release)
def get_release(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific release by ID"""
    release = db.query(ReleaseModel).filter(ReleaseModel.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Enrich status
    tracks = db.query(TrackModel).filter(TrackModel.release_id == release.id).all()
    has_contract = db.query(ContractAsset).filter(
        ContractAsset.asset_type == 'Release', 
        ContractAsset.asset_id == release.id
    ).first() is not None
    
    has_artist_contract = False
    if release.artist_id:
        has_artist_contract = db.query(ContractParty).filter(
            ContractParty.entity_type == 'Artist',
            ContractParty.entity_id == release.artist_id
        ).first() is not None

    release.status_quo = compute_release_status(release, tracks, has_contract, has_artist_contract)
    
    return release


@router.put("/releases/{release_id}", response_model=Release)
def update_release(
    release_id: int,
    release_update: ReleaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a release"""
    db_release = db.query(ReleaseModel).filter(ReleaseModel.id == release_id).first()
    if not db_release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    update_data = release_update.model_dump(exclude_unset=True)
    track_ids = update_data.pop("track_ids", None)
    
    # Check for duplicate title if title is being updated
    if "title" in update_data and update_data["title"] != db_release.title:
        existing = db.query(ReleaseModel).filter(ReleaseModel.title == update_data["title"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A release with the title '{update_data['title']}' already exists."
            )

    try:
        for field, value in update_data.items():
            setattr(db_release, field, value)
        
        if track_ids is not None:
            db.query(TrackModel).filter(TrackModel.release_id == release_id).update({"release_id": None}, synchronize_session=False)
            if track_ids:
                db.query(TrackModel).filter(TrackModel.id.in_(track_ids)).update({"release_id": release_id}, synchronize_session=False)
        
        db.commit()
        db.refresh(db_release)
        return db_release
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A database integrity error occurred. This release title, catalog number, or UPC might already be in use."
        )


@router.get("/releases/{release_id}/tracks", response_model=List[Track])
def get_release_tracks(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all tracks for a specific release"""
    tracks = db.query(TrackModel).filter(TrackModel.release_id == release_id).all()
    return tracks


@router.delete("/releases/{release_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_release(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a release"""
    db_release = db.query(ReleaseModel).filter(ReleaseModel.id == release_id).first()
    if not db_release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    from sqlalchemy.exc import IntegrityError
    try:
        # Unlink tracks first
        db.query(TrackModel).filter(TrackModel.release_id == release_id).update({"release_id": None}, synchronize_session=False)
        db.commit()

        # Now delete release
        db.delete(db_release)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete release because it is linked to contracts or other strict dependencies."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not delete release: {str(e)}"
        )
    return None


# ==================== TRACKS ====================

@router.get("/tracks", response_model=List[Track])
def list_tracks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """List all tracks"""
    return track_repository.get_all(db, organization_id=org_id, skip=skip, limit=limit)


@router.post("/tracks", response_model=Track, status_code=status.HTTP_201_CREATED)
def create_track(
    track: TrackCreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new track"""
    # Check for existing track with same title
    existing = db.query(TrackModel).filter(TrackModel.title == track.title).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A track with the title '{track.title}' already exists."
        )

    try:
        db_track = track_repository.create(db, track.model_dump(), organization_id=org_id)
        audit_service.log(db, "CREATE", "Track", db_track.id, current_user.id, changes=track.model_dump(), organization_id=org_id)
        return db_track
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A track with this ISRC, Track ID, or Title already exists."
        )


@router.get("/tracks/{track_id}", response_model=Track)
def get_track(
    track_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific track by ID"""
    track = track_repository.get_by_id(db, track_id, organization_id=org_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return track


@router.put("/tracks/{track_id}", response_model=Track)
def update_track(
    track_id: int,
    track_update: TrackUpdate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """Update a track"""
    db_track = track_repository.get_by_id(db, track_id, organization_id=org_id)
    if not db_track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    update_data = track_update.model_dump(exclude_unset=True)

    # Check for duplicate title if title is being updated
    if "title" in update_data and update_data["title"] != db_track.title:
        existing = db.query(TrackModel).filter(TrackModel.title == update_data["title"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A track with the title '{update_data['title']}' already exists."
            )

    try:
        updated_track = track_repository.update(db, db_track, update_data)
        audit_service.log(db, "UPDATE", "Track", track_id, current_user.id, changes=update_data, organization_id=org_id)
        return updated_track
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A database integrity error occurred. This track title or ISRC might already be in use."
        )


@router.delete("/tracks/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_track(
    track_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a track"""
    try:
        success = track_repository.delete(db, track_id, organization_id=org_id)
        if not success:
            raise HTTPException(status_code=404, detail="Track not found")
        
        audit_service.log(db, "DELETE", "Track", track_id, current_user.id, organization_id=org_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not delete track: {str(e)}")
    return None


# ==================== WORKS ====================

@router.get("/works", response_model=List[Work])
def list_works(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all works"""
    works = db.query(WorkModel).offset(skip).limit(limit).all()
    return works


@router.post("/works", response_model=Work, status_code=status.HTTP_201_CREATED)
def create_work(
    work: WorkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new work"""
    # Check for existing work with same title
    existing = db.query(WorkModel).filter(WorkModel.title == work.title).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A musical work with the title '{work.title}' already exists."
        )

    try:
        db_work = WorkModel(**work.model_dump())
        db.add(db_work)
        db.commit()
        db.refresh(db_work)
        return db_work
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A database integrity error occurred. This work title or ID might already exist."
        )


@router.get("/works/{work_id}", response_model=Work)
def get_work(
    work_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific work by ID"""
    work = db.query(WorkModel).filter(WorkModel.id == work_id).first()
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


@router.put("/works/{work_id}", response_model=Work)
def update_work(
    work_id: int,
    work_update: WorkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a work"""
    db_work = db.query(WorkModel).filter(WorkModel.id == work_id).first()
    if not db_work:
        raise HTTPException(status_code=404, detail="Work not found")
    
    update_data = work_update.model_dump(exclude_unset=True)
    
    # Check for duplicate title if title is being updated
    if "title" in update_data and update_data["title"] != db_work.title:
        existing = db.query(WorkModel).filter(WorkModel.title == update_data["title"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A musical work with the title '{update_data['title']}' already exists."
            )

    try:
        for field, value in update_data.items():
            setattr(db_work, field, value)
        
        db.commit()
        db.refresh(db_work)
        return db_work
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A database integrity error occurred. This work title or ISWC might already be in use."
        )


@router.delete("/works/{work_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work(
    work_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a work"""
    db_work = db.query(WorkModel).filter(WorkModel.id == work_id).first()
    if not db_work:
        raise HTTPException(status_code=404, detail="Work not found")
    
    from sqlalchemy.exc import IntegrityError
    try:
        db.delete(db_work)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete work because it is linked to tracks, contracts, or releases. Please remove these links first."
        )
    return None


# ==================== LABELS ====================

@router.get("/labels", response_model=List[Label])
def list_labels(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all labels"""
    labels = db.query(LabelModel).offset(skip).limit(limit).all()
    return labels


@router.post("/labels", response_model=Label, status_code=status.HTTP_201_CREATED)
def create_label(
    label: LabelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new label"""
    # Check for existing label with same name
    existing = db.query(LabelModel).filter(LabelModel.name == label.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A label with the name '{label.name}' already exists."
        )

    try:
        db_label = LabelModel(**label.model_dump())
        db.add(db_label)
        db.commit()
        db.refresh(db_label)
        return db_label
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A database integrity error occurred. This label name or ID might already exist."
        )


@router.get("/labels/{label_id}", response_model=Label)
def get_label(
    label_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific label by ID"""
    label = db.query(LabelModel).filter(LabelModel.id == label_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    return label


@router.get("/labels/{label_id}/artists", response_model=List[Artist])
def get_label_artists(
    label_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all artists for a specific label"""
    artists = db.query(ArtistModel).filter(ArtistModel.label_id == label_id).all()
    return artists


@router.get("/labels/{label_id}/releases", response_model=List[Release])
def get_label_releases(
    label_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all releases for a specific label"""
    releases = db.query(ReleaseModel).filter(ReleaseModel.label_id == label_id).all()
    return releases


@router.put("/labels/{label_id}", response_model=Label)
def update_label(
    label_id: int,
    label_update: LabelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a label"""
    db_label = db.query(LabelModel).filter(LabelModel.id == label_id).first()
    if not db_label:
        raise HTTPException(status_code=404, detail="Label not found")
    
    update_data = label_update.model_dump(exclude_unset=True)
    
    # Check for duplicate name if name is being updated
    if "name" in update_data and update_data["name"] != db_label.name:
        existing = db.query(LabelModel).filter(LabelModel.name == update_data["name"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A label with the name '{update_data['name']}' already exists."
            )

    try:
        for field, value in update_data.items():
            setattr(db_label, field, value)
        
        db.commit()
        db.refresh(db_label)
        return db_label
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A database integrity error occurred. This label name or ID might already be in use."
        )


@router.delete("/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_label(
    label_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a label"""
    db_label = db.query(LabelModel).filter(LabelModel.id == label_id).first()
    if not db_label:
        raise HTTPException(status_code=404, detail="Label not found")
    
    from sqlalchemy.exc import IntegrityError
    try:
        db.delete(db_label)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete label because it is associated with artists or releases."
        )
    return None


# ==================== PUBLISHERS ====================

@router.get("/publishers", response_model=List[Publisher])
def list_publishers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all publishers"""
    publishers = db.query(PublisherModel).offset(skip).limit(limit).all()
    return publishers


@router.post("/publishers", response_model=Publisher, status_code=status.HTTP_201_CREATED)
def create_publisher(
    publisher: PublisherCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new publisher"""
    # Check for existing publisher with same name
    existing = db.query(PublisherModel).filter(PublisherModel.name == publisher.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A publisher with the name '{publisher.name}' already exists."
        )

    try:
        db_publisher = PublisherModel(**publisher.model_dump())
        db.add(db_publisher)
        db.commit()
        db.refresh(db_publisher)
        return db_publisher
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A database integrity error occurred. This publisher name or ID might already exist."
        )


@router.get("/publishers/{publisher_id}", response_model=Publisher)
def get_publisher(
    publisher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific publisher by ID"""
    publisher = db.query(PublisherModel).filter(PublisherModel.id == publisher_id).first()
    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    return publisher


@router.get("/publishers/{publisher_id}/artists", response_model=List[Artist])
def get_publisher_artists(
    publisher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all artists for a specific publisher"""
    artists = db.query(ArtistModel).filter(ArtistModel.publisher_id == publisher_id).all()
    return artists


@router.get("/publishers/{publisher_id}/works", response_model=List[Work])
def get_publisher_works(
    publisher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all works for a specific publisher"""
    works = db.query(WorkModel).filter(WorkModel.publisher_id == publisher_id).all()
    return works


@router.put("/publishers/{publisher_id}", response_model=Publisher)
def update_publisher(
    publisher_id: int,
    publisher_update: PublisherUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a publisher"""
    db_publisher = db.query(PublisherModel).filter(PublisherModel.id == publisher_id).first()
    if not db_publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    
    update_data = publisher_update.model_dump(exclude_unset=True)
    
    # Check for duplicate name if name is being updated
    if "name" in update_data and update_data["name"] != db_publisher.name:
        existing = db.query(PublisherModel).filter(PublisherModel.name == update_data["name"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A publisher with the name '{update_data['name']}' already exists."
            )

    try:
        for field, value in update_data.items():
            setattr(db_publisher, field, value)
        
        db.commit()
        db.refresh(db_publisher)
        return db_publisher
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A database integrity error occurred. This publisher name or ID might already be in use."
        )


@router.delete("/publishers/{publisher_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_publisher(
    publisher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a publisher"""
    db_publisher = db.query(PublisherModel).filter(PublisherModel.id == publisher_id).first()
    if not db_publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    
    from sqlalchemy.exc import IntegrityError
    try:
        db.delete(db_publisher)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete publisher because it is associated with artists or works."
        )
    return None


# ==================== PROs ====================

@router.get("/pros", response_model=List[PRO])
def list_pros(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all PROs"""
    pros = db.query(PROModel).offset(skip).limit(limit).all()
    return pros


@router.post("/pros", response_model=PRO, status_code=status.HTTP_201_CREATED)
def create_pro(
    pro: PROCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new PRO"""
    # Check for existing PRO with same name
    existing = db.query(PROModel).filter(PROModel.name == pro.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A PRO with the name '{pro.name}' already exists."
        )

    try:
        db_pro = PROModel(**pro.model_dump())
        db.add(db_pro)
        db.commit()
        db.refresh(db_pro)
        return db_pro
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A database integrity error occurred. This PRO name or ID might already exist."
        )


@router.get("/pros/{pro_id}", response_model=PRO)
def get_pro(
    pro_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific PRO by ID"""
    pro = db.query(PROModel).filter(PROModel.id == pro_id).first()
    if not pro:
        raise HTTPException(status_code=404, detail="PRO not found")
    return pro


@router.put("/pros/{pro_id}", response_model=PRO)
def update_pro(
    pro_id: int,
    pro_update: PROUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a PRO"""
    db_pro = db.query(PROModel).filter(PROModel.id == pro_id).first()
    if not db_pro:
        raise HTTPException(status_code=404, detail="PRO not found")
    
    update_data = pro_update.model_dump(exclude_unset=True)
    
    # Check for duplicate name if name is being updated
    if "name" in update_data and update_data["name"] != db_pro.name:
        existing = db.query(PROModel).filter(PROModel.name == update_data["name"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A PRO with the name '{update_data['name']}' already exists."
            )

    try:
        for field, value in update_data.items():
            setattr(db_pro, field, value)
        
        db.commit()
        db.refresh(db_pro)
        return db_pro
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A database integrity error occurred. This PRO name or ID might already be in use."
        )


@router.delete("/pros/{pro_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pro(
    pro_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a PRO"""
    db_pro = db.query(PROModel).filter(PROModel.id == pro_id).first()
    if not db_pro:
        raise HTTPException(status_code=404, detail="PRO not found")
    
    from sqlalchemy.exc import IntegrityError
    try:
        db.delete(db_pro)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete PRO because it is linked to artists."
        )
    return None
