from database import SessionLocal
from models.contract import ContractAsset, ContractParty
from models.release import Release

db = SessionLocal()
r = db.query(Release).filter(Release.id == 1).first()
print(f"Release: {r.title}")
c_rels = db.query(ContractAsset).filter(ContractAsset.asset_type == 'Release', ContractAsset.asset_id == 1).all()
print(f"ContractAsset (Release): {c_rels}")

from models.track import Track
tracks = db.query(Track).filter(Track.release_id == 1).all()
track_ids = [t.id for t in tracks]
print(f"Tracks: {track_ids}")
if track_ids:
    c_tracks = db.query(ContractAsset).filter(ContractAsset.asset_type == 'Track', ContractAsset.asset_id.in_(track_ids)).all()
    print(f"ContractAsset (Tracks): {c_tracks}")
else:
    print("ContractAsset (Tracks): None")

parties = db.query(ContractParty).all()
print(f"Total parties: {len(parties)}")
for p in parties:
    if p.entity_type == 'Artist' and p.entity_id in (r.artist_ids or []):
         print(f"Match party! ID {p.id}, entity_id {p.entity_id}")

