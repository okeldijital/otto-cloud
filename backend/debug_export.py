import sys
import os

# Add current directory to path so imports work
sys.path.append(os.getcwd())

try:
    import openpyxl
    print("openpyxl is installed")
except ImportError:
    print("openpyxl is NOT installed")
    # sys.exit(1) # Don't exit yet, let's see other errors

from database import SessionLocal
from models.release import Release
from models.artist import Artist
from models.label import Label

def test_export():
    db = SessionLocal()
    try:
        releases = db.query(Release).all()
        print(f"Found {len(releases)} releases")
        data = []
        for r in releases:
            try:
                # Get artist names logic from reports.py
                artist_names = "Various Artists"
                # Mimic the logic exactly
                ids = r.artist_ids or ([r.artist_id] if r.artist_id else [])
                if ids:
                    # In reports.py: artists = db.query(Artist).filter(Artist.id.in_(ids)).all()
                    # We need to make sure ids is a list of simple types (int)
                    # if ids contains something else, it might fail
                    artists = db.query(Artist).filter(Artist.id.in_(ids)).all()
                    artist_names = ", ".join([a.name for a in artists])
                elif r.artist:
                    artist_names = r.artist.name

                item = {
                    "ID": r.id,
                    "Title": r.title,
                    "UPC": r.upc_code,
                    "Release Date": r.release_date.strftime("%Y-%m-%d") if r.release_date else "",
                    "Type": r.release_type,
                    "Label": r.label.name if r.label else "N/A",
                    "Artist": artist_names
                }
                
                # Verify we can make this a string (as done in generate_excel)
                for k,v in item.items():
                    str(v)
                    
                print(f"Processed release {r.id}: {r.title}")
            except Exception as e:
                print(f"Error processing release {r.id}: {e}")
                import traceback
                traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_export()
