import sqlite3
import os

DB_PATH = "backend/otto_data/db/app.db"

if not os.path.exists(DB_PATH):
    print(f"Database not found at {DB_PATH}")
    exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check if column exists
try:
    cursor.execute("SELECT entity_uuid FROM audit_logs LIMIT 1")
    print("Column entity_uuid already exists.")
except sqlite3.OperationalError:
    print("Column entity_uuid missing. Adding it...")
    try:
        # SQLite doesn't strictly have UUID type, use CHAR(36) or TEXT
        cursor.execute("ALTER TABLE audit_logs ADD COLUMN entity_uuid CHAR(36)")
        conn.commit()
        print("Column added successfully.")
    except Exception as e:
        print(f"Error adding column: {e}")

conn.close()
