import sqlite3
import os

db_path = "backend/otto_data/db/app.db"

if not os.path.exists(db_path):
    print(f"File not found: {db_path}")
else:
    print(f"Inspecting DB at: {db_path}")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [r[0] for r in cursor.fetchall()]
        print(f"Tables: {tables}")

        if 'releases' in tables:
            cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='releases';")
            print("Releases schema:")
            print(cursor.fetchone()[0])
            
        conn.close()
    except Exception as e:
        print(e)
