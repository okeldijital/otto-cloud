from database import SessionLocal
from models.release import Release
import json

db = SessionLocal()
releases = db.query(Release).limit(5).all()
for r in releases:
    print(f"Release ID: {r.id}, Title: {r.title}")
    print(f"artist_id: {r.artist_id} (type: {type(r.artist_id)})")
    print(f"artist_ids: {r.artist_ids} (type: {type(r.artist_ids)})")
    if r.artist_ids:
        print(f"artist_ids raw: {r.artist_ids}, type of first element: {type(r.artist_ids[0]) if len(r.artist_ids) > 0 else 'empty'}")
        print("-------------")
