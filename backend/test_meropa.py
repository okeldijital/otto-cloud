from database import SessionLocal
from models.contract import ContractAsset, ContractParty
from models.release import Release

db = SessionLocal()
r = db.query(Release).filter(Release.title == 'Meropa').first()
if not r:
    print("Release Meropa not found")
    exit()

print(f"Release: {r.id} - {r.title}")
c_rels = db.query(ContractAsset).filter(ContractAsset.asset_type == 'Release', ContractAsset.asset_id == r.id).all()
print(f"ContractAsset (Release): {c_rels}")

from models.track import Track
tracks = db.query(Track).filter(Track.release_id == r.id).all()
track_ids = [t.id for t in tracks]
print(f"Tracks: {track_ids}")
if track_ids:
    c_tracks = db.query(ContractAsset).filter(ContractAsset.asset_type == 'Track', ContractAsset.asset_id.in_(track_ids)).all()
    print(f"ContractAsset (Tracks): {c_tracks}")
else:
    print("ContractAsset (Tracks): None")

