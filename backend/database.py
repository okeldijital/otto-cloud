from sqlalchemy import create_engine, TypeDecorator, Integer
from sqlalchemy.orm import sessionmaker, declarative_base
import uuid
from config import settings

class SafeUuid(TypeDecorator):
    """
    Handles UUIDs in the app while storing as Integer in the DB for compatibility.
    This satisfies the requirement that organization_id be a UUID object in the app
    while allowing existing integer-based data (like dev org ID 1) to remain visible.
    """
    impl = Integer
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            # For OTTO V1, we map UUID(int=1) back to integer 1 for storage
            return value.int
        try:
            # If it's a numeric string or integer, return as int
            return int(value)
        except (ValueError, TypeError):
            # If it's a UUID string, convert to int for storage
            try:
                return uuid.UUID(value).int
            except (ValueError, TypeError):
                return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        # Convert integer back to UUID object for the app
        try:
            return uuid.UUID(int=value)
        except (ValueError, TypeError):
            return value


# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=settings.DEBUG
)

# Enable required PRAGMAs for SQLite (§3 of Governance Spec)
from sqlalchemy import event
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """
    Enforce mandatory SQLite settings per Data Governance Spec §3:
    - journal_mode=WAL (Write-Ahead Logging)
    - synchronous=FULL (durability)
    - foreign_keys=ON (referential integrity)
    - busy_timeout=5000 (handle concurrent access)
    """
    if "sqlite" in settings.DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=FULL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA busy_timeout=5000;")
        cursor.close()


# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
