"""
Database engine configuration, session management, and connectivity checking.
Supports lazy engine initialization so the application can start and run tests
even before PostgreSQL driver or server is configured.
"""

from typing import Generator, Optional
from sqlalchemy import create_engine, text, Engine
from sqlalchemy.orm import sessionmaker, Session
from app.config import get_settings

settings = get_settings()

# Cached engine and sessionmaker instances
_engine: Optional[Engine] = None
_SessionLocal: Optional[sessionmaker] = None


def get_engine() -> Engine:
    """
    Returns the SQLAlchemy engine, initializing it lazily on first access.
    Automatically normalizes 'postgresql://' to 'postgresql+psycopg2://' if no dialect is specified.
    """
    global _engine
    if _engine is None:
        db_url = settings.DATABASE_URL
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        _engine = create_engine(
            db_url,
            pool_pre_ping=True,  # Automatically tests connections before using them
            echo=False,
        )
    return _engine


def get_sessionmaker() -> sessionmaker:
    """
    Returns the SQLAlchemy session factory bound to the engine.
    """
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=get_engine(),
        )
    return _SessionLocal


class _EngineProxy:
    """
    Proxy object allowing imports of `engine` while deferring actual engine creation.
    """
    def __getattr__(self, name):
        return getattr(get_engine(), name)


class _SessionLocalProxy:
    """
    Proxy object allowing imports of `SessionLocal` while deferring factory creation.
    """
    def __call__(self, *args, **kwargs):
        return get_sessionmaker()(*args, **kwargs)


engine = _EngineProxy()
SessionLocal = _SessionLocalProxy()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a database session per request.
    Ensures the session is cleanly closed after request completion.
    """
    db = get_sessionmaker()()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> dict:
    """
    Safely tests whether PostgreSQL is reachable and responsive.
    Returns a dictionary with connectivity status and details.
    Does not raise exceptions, ensuring calling endpoints remain resilient.
    """
    try:
        eng = get_engine()
        with eng.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {
            "connected": True,
            "message": "Database connection successful.",
        }
    except Exception as exc:
        return {
            "connected": False,
            "message": f"Database unreachable: {str(exc)}",
        }


def ensure_user_email_index(engine: Engine) -> None:
    """Adds the case-insensitive unique email constraint without replacing data."""
    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower "
                "ON users (lower(email))"
            )
        )
