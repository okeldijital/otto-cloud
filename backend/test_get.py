from database import SessionLocal
from models.user import User
from routes.catalog import get_artist_releases

def test():
    db = SessionLocal()
    artist_id = 1
    rels = get_artist_releases(artist_id=artist_id, db=db, current_user=None)
    print(f"Total returned for artist {artist_id}: {len(rels)}")

if __name__ == "__main__":
    test()
