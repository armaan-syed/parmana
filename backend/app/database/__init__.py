"""
Database module initialization and re-exports.
"""

from app.database.base import Base
from app.database.connection import (
    engine,
    SessionLocal,
    get_engine,
    get_db,
    check_db_connection,
    ensure_user_email_index,
)

__all__ = [
    "Base",
    "engine",
    "SessionLocal",
    "get_engine",
    "get_db",
    "check_db_connection",
    "ensure_user_email_index",
]
