from sqlalchemy import create_engine, TypeDecorator, Integer
from sqlalchemy.orm import sessionmaker, declarative_base
import uuid
from config import settings

class SafeUuid(TypeDecorator):
    """
    Handles UUIDs in the app.
    - SQLite: Stores as Integer for compatibility with legacy OTTO V1 data.
    - PostgreSQL: Stores as native UUID.
    """
    impl = Integer # Default for SQLite compatibility
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(Integer())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        
        # If it's already a UUID object
        if isinstance(value, uuid.UUID):
            if dialect.name == 'postgresql':
                return value
            return value.int
            
        try:
            # If it's a numeric string or integer, return as int or UUID
            val_int = int(value)
            if dialect.name == 'postgresql':
                return uuid.UUID(int=val_int)
            return val_int
        except (ValueError, TypeError):
            # If it's a UUID string
            try:
                u = uuid.UUID(value)
                if dialect.name == 'postgresql':
                    return u
                return u.int
            except (ValueError, TypeError):
                return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        # Convert integer back to UUID object for the app (SQLite case)
        try:
            return uuid.UUID(int=value)
        except (ValueError, TypeError):
            return value


# Create database engine
db_url = settings.DATABASE_URL
is_sqlite = "sqlite" in db_url
is_postgres = "postgresql" in db_url

connect_args = {}
if is_sqlite:
    connect_args["check_same_thread"] = False
elif is_postgres:
    # Neon and most cloud Postgres require SSL
    if "sslmode" not in db_url:
        # If not already in URL, we can force it in connect_args if needed
        # but usually it's best in the URL: postgresql://user:pass@host/db?sslmode=require
        pass

engine_args = {
    "connect_args": connect_args,
    "echo": settings.DEBUG,
    "pool_pre_ping": True
}

if is_postgres:
    # Sensible pooling for Postgres
    engine_args.update({
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    })

engine = create_engine(db_url, **engine_args)

# Enable required PRAGMAs for SQLite (§3 of Governance Spec)
from sqlalchemy import event
@event.listens_for(engine, "connect")
def set_db_params(dbapi_connection, connection_record):
    """
    Enforce mandatory SQLite settings per Data Governance Spec §3.
    Skip for PostgreSQL/other dialects.
    """
    if is_sqlite:
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
