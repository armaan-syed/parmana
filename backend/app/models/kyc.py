from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, JSON, Float, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class User(Base):
    """
    User entity representing customers and administrators.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # e.g. "CUS-1042" or "ADM-001"
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    __table_args__ = (Index("uq_users_email_lower", func.lower(email), unique=True),)
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="customer")  # "customer" or "admin"
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    customer: Mapped[Optional["Customer"]] = relationship("Customer", back_populates="user", uselist=False)


class Customer(Base):
    """
    Customer record containing company baseline information for KYC comparison.
    """
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # e.g. "CUS-1042"
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255))
    dob: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # e.g. "14 Mar 1994"
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    kyc_status: Mapped[str] = mapped_column(String(50), default="SUBMITTED")  # SUBMITTED, UNDER_REVIEW, VERIFIED, REJECTED
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="customer")
    kyc_requests: Mapped[List["KycRequest"]] = relationship("KycRequest", back_populates="customer", cascade="all, delete-orphan")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="customer", cascade="all, delete-orphan")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="customer")


class KycRequest(Base):
    """
    Tracks KYC requests, document status, extracted comparisons, and verification decisions.
    """
    __tablename__ = "kyc_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    request_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # e.g. "KYC-2841"
    customer_id: Mapped[str] = mapped_column(String(50), ForeignKey("customers.customer_id"), index=True)
    status: Mapped[str] = mapped_column(String(50), default="SUBMITTED")  # SUBMITTED, UNDER_REVIEW, VERIFIED, REJECTED
    submitted_at: Mapped[str] = mapped_column(String(50), default="12 Oct 2026")
    updated_at: Mapped[str] = mapped_column(String(50), default="12 Oct 2026")
    documents_list: Mapped[Optional[list]] = mapped_column(JSON, default=list)  # ["Aadhaar", "Voter ID"]
    fields_data: Mapped[Optional[list]] = mapped_column(JSON, default=list)  # Comparison fields list
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="kyc_requests")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="kyc_request")


class Document(Base):
    """
    Metadata for uploaded identity documents.
    """
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id: Mapped[str] = mapped_column(String(50), ForeignKey("customers.customer_id"), index=True)
    document_type: Mapped[str] = mapped_column(String(50))  # e.g. "Aadhaar", "Voter ID"
    filename: Mapped[str] = mapped_column(String(255))
    s3_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="UPLOADED")  # UPLOADED, PROCESSED, FAILED
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="documents")


class AuditLog(Base):
    """
    Immutable audit history recording every administrative and verification change.
    """
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    audit_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # e.g. "AUD-0481"
    request_id: Mapped[Optional[str]] = mapped_column(String(50), ForeignKey("kyc_requests.request_id"), nullable=True)
    customer_id: Mapped[str] = mapped_column(String(50), ForeignKey("customers.customer_id"), index=True)
    customer_name: Mapped[str] = mapped_column(String(255))
    admin_name: Mapped[str] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(255))
    field: Mapped[str] = mapped_column(String(255))
    previous_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    next_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reason: Mapped[str] = mapped_column(Text)
    timestamp: Mapped[str] = mapped_column(String(100))

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="audit_logs")
    kyc_request: Mapped[Optional["KycRequest"]] = relationship("KycRequest", back_populates="audit_logs")
