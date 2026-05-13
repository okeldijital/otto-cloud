import os
import sys
import platform
import logging
import json
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

# PACKAGED DETECTION
IS_PACKAGED = getattr(sys, 'frozen', False)

class Settings(BaseSettings):
    """Application configuration settings"""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )
    
    APP_NAME: str = "OTTO"
    APP_VERSION: str = "1.0.1"
    APP_ENV: str = "development"
    
    # Paths (initialized in __init__)
    APP_DATA_DIR: str = ""
    ACTIVE_DB_POINTER_FILE: str = ""
    DATABASE_URL: str = ""
    STORAGE_ROOT: str = ""
    IMPORT_LOGS_ROOT: str = ""
    TEMP_ROOT: str = ""
    EVIDENCE_ROOT: str = ""
    UPLOAD_DIR: str = ""
    LOG_FILE: str = ""
    BACKUP_ROOT: str = ""
    BACKUP_RETENTION_COUNT: int = 5
    BACKUP_MAX_TOTAL_GB: int = 10
    
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
    
    # S3 Storage Configuration
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET_NAME: Optional[str] = None
    S3_REGION_NAME: str = "us-east-1"

    
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
    AI_CONTRACT_WIZARD_ENABLED: bool = True
    AI_CONTRACT_TRACK_MAP_ENABLED: bool = True
    AI_CONTRACT_ATTACH_PLAN_ENABLED: bool = True
    AI_CONTRACT_ATTACH_APPLY_ENABLED: bool = True
    AI_ATTACH_REQUIRE_BACKUP: bool = True
    AI_CONTRACT_EXTRACT_V2_ENABLED: bool = True
    AI_LLM_ENABLED: bool = False
    AI_LLM_PROVIDER: str = "openai_compatible"
    AI_LLM_MODEL: str = "gpt-4.1-mini"
    AI_LLM_EXTRACT_ENABLED: bool = False
    AI_LLM_API_BASE: str = ""
    AI_LLM_API_KEY: str = ""
    AI_LLM_TIMEOUT_S: int = 45
    AI_LLM_MAX_INPUT_CHARS: int = 120000
    AI_LLM_MAX_PAGES: int = 6
    AI_LLM_TEMPERATURE: float = 0.0
    AI_LLM_FORCE_JSON: bool = True
    ADMIN_RESTORE_ENABLED: bool = True

    def llm_extract_enabled(self) -> bool:
        llm_switch = self.AI_LLM_ENABLED or self.AI_LLM_EXTRACT_ENABLED
        return (
            self.AI_ENABLED
            and self.AI_CONTRACT_INTEL_ENABLED
            and llm_switch
            and bool(self.AI_LLM_API_KEY)
        )

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
            self.AUTH_DISABLED = False # SaaS requires auth

        # Resolve Data Directory
        # UNIVERSAL SINGLE SOURCE OF TRUTH
        # Priority: OTTO_APP_DATA_DIR -> /tmp/otto (if cloud) -> ~/.otto/data
        app_data_env = os.getenv("OTTO_APP_DATA_DIR")
        if app_data_env:
            data_parent = Path(app_data_env).expanduser().resolve()
        else:
            if self.APP_ENV in ["production", "staging", "cloud"]:
                data_parent = Path("/tmp/otto/data").resolve()
            else:
                data_parent = (Path.home() / ".otto" / "data").resolve()

        # In serverless environments, we must ensure we don't crash if we can't create dirs
        # but /tmp should be writable.
        try:
            data_parent.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logging.warning(f"Could not create data directory {data_parent}: {e}")

        self.APP_DATA_DIR = str(data_parent)
        
        # Create subdirectories
        db_dir = data_parent / "db"
        storage_dir = Path(os.getenv("STORAGE_ROOT", data_parent / "storage"))
        import_logs_dir = Path(os.getenv("IMPORT_LOGS_ROOT", data_parent / "import_logs"))
        temp_dir = Path(os.getenv("TEMP_ROOT", data_parent / "temp"))
        evidence_dir = Path(os.getenv("EVIDENCE_ROOT", data_parent / "evidence"))
        logs_dir = data_parent / "logs"
        runtime_dir = data_parent / "runtime"
        
        for d in [db_dir, storage_dir, import_logs_dir, temp_dir, evidence_dir, logs_dir, runtime_dir]:
            try:
                d.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                logging.warning(f"Could not create directory {d}: {e}")
        
        # BACKUP_ROOT: canonical outside data tree
        backup_root_env = os.getenv("BACKUP_ROOT")
        if backup_root_env:
            backup_dir = Path(backup_root_env).expanduser().resolve()
        else:
            backup_dir = data_parent.parent / "backups"
        
        try:
            backup_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logging.warning(f"Could not create backup directory {backup_dir}: {e}")
            
        self.BACKUP_ROOT = str(backup_dir)
        active_db_pointer = runtime_dir / "active_db.json"
        self.ACTIVE_DB_POINTER_FILE = str(active_db_pointer)

        # Set DATABASE_URL with deterministic priority:
        # 1) Already set (via Pydantic from .env or env vars)
        # 2) OTTO_DB_PATH env
        # 3) runtime active_db pointer file
        # 4) default ~/.otto/data/db/otto.sqlite
        
        resolved_database_url = self.DATABASE_URL
        db_path_env = os.getenv("OTTO_DB_PATH")
        
        if not resolved_database_url:
            if db_path_env:
                resolved_database_url = f"sqlite:///{Path(db_path_env).expanduser().resolve()}"
            elif active_db_pointer.exists():
                try:
                    pointer_payload = json.loads(active_db_pointer.read_text(encoding="utf-8"))
                    pointer_database_url = pointer_payload.get("database_url")
                    if isinstance(pointer_database_url, str) and pointer_database_url:
                        resolved_database_url = pointer_database_url
                except Exception:
                    pass
        
        if not resolved_database_url:
            resolved_database_url = f"sqlite:///{db_dir}/otto.sqlite"
            
        self.DATABASE_URL = resolved_database_url

        # Ensure database path is absolute
        if self.DATABASE_URL.startswith("sqlite:///"):
            db_path_check = Path(self.DATABASE_URL.replace("sqlite:///", ""))
            assert db_path_check.is_absolute(), f"Database path must be absolute: {self.DATABASE_URL}"
            
        self.STORAGE_ROOT = str(storage_dir)
        self.IMPORT_LOGS_ROOT = str(import_logs_dir)
        self.TEMP_ROOT = str(temp_dir)
        self.EVIDENCE_ROOT = str(evidence_dir)
        self.UPLOAD_DIR = str(storage_dir)
        # Required persistent backend log path
        self.LOG_FILE = str(logs_dir / "backend.log")


settings = Settings()
