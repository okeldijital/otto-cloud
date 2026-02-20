from database import SessionLocal
from models.contract_track_links import ContractTrackLink

db = SessionLocal()
links = db.query(ContractTrackLink).count()
print(f"Total links in ContractTrackLink: {links}")
from models.contract import ContractAsset
assets = db.query(ContractAsset).filter(ContractAsset.asset_type == 'Track').count()
print(f"Total links in ContractAsset (type Track): {assets}")
