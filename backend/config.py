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
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    
    # Paths (initialized in __init__)
    DATABASE_URL: str = ""
    UPLOAD_DIR: str = ""
    LOG_FILE: str = ""
    
    # Desktop Settings
    AUTH_DISABLED: bool = False
    DEBUG: bool = False
    PORT: int = 8000 # Default FastAPI port
    
    # Security
    SECRET_KEY: str = "otto-internal-secret-key-development"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 
    
    CORS_ORIGINS: list = ["*"]

    # Storage
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024 
    ALLOWED_EXTENSIONS: list = ["pdf", "png", "jpg", "mp3", "wav", "docx", "xlsx"]

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

        # Resolve Data Directory
        if self.APP_ENV == "desktop":
            if platform.system() == "Darwin":
                data_parent = Path.home() / "Library/Application Support/OTTO"
            elif platform.system() == "Windows":
                data_parent = Path.home() / "AppData/Local/OTTO"
            else:
                data_parent = Path.home() / ".local/share/OTTO"
        else:
            # Dev local folder
            data_parent = Path(os.path.abspath(os.path.dirname(__file__))) / "otto_data"

        data_parent.mkdir(parents=True, exist_ok=True)
        db_dir = data_parent / "db"
        storage_dir = data_parent / "storage"
        db_dir.mkdir(exist_ok=True)
        storage_dir.mkdir(exist_ok=True)
        
        if not self.DATABASE_URL:
            self.DATABASE_URL = f"sqlite:///{db_dir}/app.db"
            
        self.UPLOAD_DIR = str(storage_dir)
        self.LOG_FILE = str(data_parent / "otto_backend.log")




settings = Settings()
