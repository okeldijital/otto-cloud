from database import SessionLocal
from models.contract_track_links import ContractTrackLink

db = SessionLocal()
links = db.query(ContractTrackLink).filter(ContractTrackLink.track_id == 6).all()
print(f"Links for track 6: {links}")
