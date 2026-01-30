from sqlalchemy import create_engine, text
import os

# Define database URL
DATABASE_URL = "sqlite:///./backend/otto.db"
# If running from different dir, adjust path. Assuming running from root.

# Check if DB exists
if not os.path.exists("otto.db"):
    print("otto.db not found in current directory. Trying standard path...")
    db_path = os.path.expanduser("~/Library/Application Support/OTTO/otto.db")
    if os.path.exists(db_path):
        DATABASE_URL = f"sqlite:///{db_path}"
        print(f"Found DB at {db_path}")
    else:
        print("Could not find otto.db")
        exit(1)

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("Adding image_url column to contacts table...")
        conn.execute(text("ALTER TABLE contacts ADD COLUMN image_url VARCHAR(500)"))
        conn.commit()
        print("Success!")
except Exception as e:
    print(f"Error (column might already exist): {e}")
