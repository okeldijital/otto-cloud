import os
import shutil
import time
from datetime import datetime
from config import settings

BACKUP_DIR = "./backups"

def create_backup():
    """Create a backup of the current database and uploads"""
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(BACKUP_DIR, f"otto_backup_{timestamp}")
    os.makedirs(backup_path)
    
    # Backup Database (assuming SQLite for now)
    if "sqlite" in settings.DATABASE_URL:
        db_file = settings.DATABASE_URL.replace("sqlite:///./", "./")
        if os.path.exists(db_file):
            shutil.copy2(db_file, os.path.join(backup_path, "otto.db"))
            
    # Backup Uploads
    if os.path.exists(settings.UPLOAD_DIR):
        shutil.copytree(settings.UPLOAD_DIR, os.path.join(backup_path, "uploads"), dirs_exist_ok=True)
        
    # Compress the backup
    shutil.make_archive(backup_path, 'zip', backup_path)
    shutil.rmtree(backup_path) # Remove the uncompressed folder
    
    return f"{backup_path}.zip"

def list_backups():
    """List all available backups"""
    if not os.path.exists(BACKUP_DIR):
        return []
        
    backups = []
    for f in os.listdir(BACKUP_DIR):
        if f.endswith(".zip"):
            full_path = os.path.join(BACKUP_DIR, f)
            stats = os.stat(full_path)
            backups.append({
                "filename": f,
                "size": stats.st_size,
                "created_at": datetime.fromtimestamp(stats.st_mtime).isoformat()
            })
    
    return sorted(backups, key=lambda x: x["created_at"], reverse=True)

def restore_backup(filename):
    """Restore from a backup zip file"""
    full_path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(full_path):
        return False
        
    temp_dir = "./temp_restore"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir)
    
    shutil.unpack_archive(full_path, temp_dir, 'zip')
    
    # Restore DB
    remote_db = os.path.join(temp_dir, "otto.db")
    if os.path.exists(remote_db):
        db_file = settings.DATABASE_URL.replace("sqlite:///./", "./")
        shutil.copy2(remote_db, db_file)
        
    # Restore Uploads
    remote_uploads = os.path.join(temp_dir, "uploads")
    if os.path.exists(remote_uploads):
        if os.path.exists(settings.UPLOAD_DIR):
            shutil.rmtree(settings.UPLOAD_DIR)
        shutil.copytree(remote_uploads, settings.UPLOAD_DIR)
        
    shutil.rmtree(temp_dir)
    return True
