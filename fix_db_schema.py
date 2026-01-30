import sqlite3

db_path = "backend/otto_data/db/app.db"

sql_commands = [
    # 1. Create new table with correct FK and existing columns
    """
    CREATE TABLE releases_new (
        id INTEGER PRIMARY KEY,
        release_id VARCHAR(50),
        title VARCHAR(255) NOT NULL,
        upc_code VARCHAR(50),
        release_date DATE,
        release_type VARCHAR(50),
        cover_art_url VARCHAR(500),
        label_id INTEGER,
        artist_id INTEGER,
        distributor_id INTEGER,
        created_at DATETIME DEFAULT (CURRENT_TIMESTAMP),
        updated_at DATETIME,
        catalog_number VARCHAR(50), 
        artist_ids JSON, 
        credits JSON,
        
        FOREIGN KEY(artist_id) REFERENCES artists (id),
        FOREIGN KEY(distributor_id) REFERENCES companies (id),
        FOREIGN KEY(label_id) REFERENCES labels (id),
        UNIQUE (upc_code)
    );
    """,
    
    # 2. Copy data
    """
    INSERT INTO releases_new (id, release_id, title, upc_code, release_date, release_type, cover_art_url, label_id, artist_id, distributor_id, created_at, updated_at, catalog_number, artist_ids, credits)
    SELECT id, release_id, title, upc_code, release_date, release_type, cover_art_url, label_id, artist_id, distributor_id, created_at, updated_at, catalog_number, artist_ids, credits
    FROM releases;
    """,
    
    # 3. Drop old table
    "DROP TABLE releases;",
    
    # 4. Rename new table
    "ALTER TABLE releases_new RENAME TO releases;"
]

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    for sql in sql_commands:
        print(f"Executing: {sql[:50]}...")
        cursor.execute(sql)
    
    conn.commit()
    conn.close()
    print("Optimization successful. Releases table now points to 'companies'.")
except Exception as e:
    print(f"Error: {e}")
