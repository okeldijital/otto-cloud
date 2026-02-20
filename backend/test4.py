from database import SessionLocal
from models.track import Track
db = SessionLocal()
tracks = db.query(Track).filter(Track.release_id == 1).all()
for t in tracks:
    print(f"Track: {t.title} -> work_id: {t.work_id}")
