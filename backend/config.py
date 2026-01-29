from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application configuration settings"""
    
    # App
    APP_NAME: str = "OTTO - Record Label Operating System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), 'otto.db'))}"
    # For PostgreSQL, use: postgresql://user:password@localhost/otto
    
    # JWT Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS: list = [
        "pdf", "doc", "docx", "xls", "xlsx", 
        "png", "jpg", "jpeg", "svg", "gif",
        "mp3", "wav", "flac", "m4a",
        "txt", "md", "csv", "json"
    ]
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]
    
    # External APIs (for metadata enrichment)
    SPOTIFY_CLIENT_ID: Optional[str] = None
    SPOTIFY_CLIENT_SECRET: Optional[str] = None
    MUSICBRAINZ_USER_AGENT: str = "OTTO/1.0.0"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
