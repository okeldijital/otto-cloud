import os
import sys
import platform
import logging
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

# PACKAGED DETECTION
IS_PACKAGED = getattr(sys, 'frozen', False)

class Settings(BaseSettings):
    """Application configuration settings"""
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)
    
    APP_NAME: str = "OTTO"
    APP_VERSION: str = "1.0.1"
    APP_ENV: str = "development"
    
    # Paths (initialized in __init__)
    DATABASE_URL: str = ""
    STORAGE_ROOT: str = ""
    IMPORT_LOGS_ROOT: str = ""
    UPLOAD_DIR: str = ""
    LOG_FILE: str = ""
    
    # Desktop Settings
    AUTH_DISABLED: bool = False
    DEBUG: bool = False
    PORT: int = 8001 # Default OTTO port for dev alignment
    
    # Security
    SECRET_KEY: str = "otto-internal-secret-key-development"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 
    
    CORS_ORIGINS: Optional[str] = None

    # Storage
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024 
    ALLOWED_EXTENSIONS: list = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "mp3", "wav", "docx", "xlsx"]

    # External APIs
    SPOTIFY_CLIENT_ID: Optional[str] = None
    SPOTIFY_CLIENT_SECRET: Optional[str] = None
    MUSICBRAINZ_USER_AGENT: Optional[str] = "OTTO/1.0.1"
    
    # AI Features (Phase 1: Read-only)
    AI_ENABLED: bool = True
    AI_CONTRACT_INTEL_ENABLED: bool = True
    AI_CONTRACT_INTAKE_ENABLED: bool = True
    AI_CONTRACT_RESOLVE_ENABLED: bool = True
    AI_RELEASE_INTEGRATION_ENABLED: bool = True
    AI_RELEASE_VALIDATION_ENABLED: bool = True
    AI_RELEASE_INTEGRATION_ATTACH_ENABLED: bool = True
    AI_CONTRACT_INGEST_ENABLED: bool = True
    AI_ROYALTY_ENABLED: bool = True
    AI_ROYALTY_PERSIST_ENABLED: bool = True
    AI_ANALYTICS_ENABLED: bool = True
    AI_CORE_WRITE_ENABLED: bool = True
    AI_CORE_WRITE_APPLY_ENABLED: bool = True
    AI_CORE_WRITE_REQUIRE_BACKUP: bool = True
    ADMIN_RESTORE_ENABLED: bool = True

    def __init__(self, **values):
        super().__init__(**values)
        
        # Determine Environment
        env_from_os = os.getenv("APP_ENV", "").lower()
        if IS_PACKAGED or env_from_os == "desktop":
            self.APP_ENV = "desktop"
            self.AUTH_DISABLED = True
            self.DEBUG = False
        else:
            self.APP_ENV = env_from_os if env_from_os else "development"
            self.DEBUG = True
            # DEV MODE: Disable auth for development
            self.AUTH_DISABLED = True  # Set to False to re-enable auth

        # Resolve Data Directory
        # Resolve Data Directory
        # UNIVERSAL SINGLE SOURCE OF TRUTH
        # Always use ~/.otto/data to ensure Dev, Desktop, and Hub share the same state.
        data_parent = Path.home() / ".otto" / "data"

        data_parent.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        db_dir = data_parent / "db"
        db_dir.mkdir(exist_ok=True)
        
        # STORAGE_ROOT and IMPORT_LOGS_ROOT can be overridden via env
        storage_root = os.getenv("STORAGE_ROOT")
        if storage_root:
            storage_dir = Path(storage_root)
        else:
            storage_dir = data_parent / "storage"
        storage_dir.mkdir(exist_ok=True, parents=True)
        
        import_logs_root = os.getenv("IMPORT_LOGS_ROOT")
        if import_logs_root:
            import_logs_dir = Path(import_logs_root)
        else:
            import_logs_dir = data_parent / "import_logs"
        import_logs_dir.mkdir(exist_ok=True, parents=True)
        
        logs_dir = data_parent / "logs"
        logs_dir.mkdir(exist_ok=True)
        
        # Set DATABASE_URL - respect env override, otherwise use SQLite
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            self.DATABASE_URL = db_url
        else:
            # Use otto.sqlite for consistency
            self.DATABASE_URL = f"sqlite:///{db_dir}/otto.sqlite"
        
        # Ensure database path is absolute
        db_path_check = Path(self.DATABASE_URL.replace('sqlite:///', ''))
        assert db_path_check.is_absolute(), f"Database path must be absolute: {self.DATABASE_URL}"
            
        self.STORAGE_ROOT = str(storage_dir)
        self.IMPORT_LOGS_ROOT = str(import_logs_dir)
        self.UPLOAD_DIR = str(storage_dir)
        # Required persistent backend log path
        self.LOG_FILE = str(logs_dir / "backend.log")


settings = Settings()





settings = Settings()
