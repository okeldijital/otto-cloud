from database import SessionLocal
from models.track import Track
from services.status_quo import compute_release_status
from models.release import Release

db = SessionLocal()
r = db.query(Release).filter(Release.title == 'Meropa').first()
tracks = db.query(Track).filter(Track.release_id == r.id).all()
from models.contract import ContractAsset, ContractParty

has_contract = db.query(ContractAsset).filter(ContractAsset.asset_type == 'Release', ContractAsset.asset_id == r.id).first() is not None
if not has_contract and tracks:
    track_ids = [t.id for t in tracks]
    has_contract = db.query(ContractAsset).filter(ContractAsset.asset_type == 'Track', ContractAsset.asset_id.in_(track_ids)).first() is not None

artist_id_list = []
if r.artist_id: artist_id_list.append(r.artist_id)
if r.artist_ids: artist_id_list.extend(r.artist_ids)
has_artist_contract = db.query(ContractParty).filter(ContractParty.entity_type == 'Artist', ContractParty.entity_id.in_(artist_id_list)).first() is not None

status = compute_release_status(r, tracks, has_contract, has_artist_contract)
print(f"Meropa status: {status}")
