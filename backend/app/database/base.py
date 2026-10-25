"""
Declarative base definition for SQLAlchemy 2.x models.
All database models created in future phases will inherit from this Base.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    SQLAlchemy 2.x Declarative Base.
    """
    pass
