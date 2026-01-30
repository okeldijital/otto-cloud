import sqlite3
import os

# Try probable paths
paths = [
    "backend/otto.db",
    os.path.expanduser("~/Library/Application Support/OTTO/db/app.db"),
    "backend/db/app.db"
]

db_path = None
for p in paths:
    if os.path.exists(p):
        db_path = p
        break

if not db_path:
    print("Could not find database file.")
else:
    print(f"Inspecting DB at: {db_path}")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='releases';")
        res = cursor.fetchone()
        if res:
            print(res[0])
        else:
            print("Table releases not found.")
        conn.close()
    except Exception as e:
        print(e)
