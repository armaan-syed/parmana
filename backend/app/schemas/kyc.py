from typing import List, Optional
import re
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ComparisonField(BaseModel):
    label: str
    existing: str
    extracted: str
    result: str  # MATCH, MISMATCH, UNCERTAIN


class KycRequestResponse(BaseModel):
    id: str
    customerId: str
    name: str
    email: str
    status: str
    submitted: str
    updated: str
    documents: List[str] = []
    fields: List[ComparisonField] = []
    reason: Optional[str] = None


class AuditEventResponse(BaseModel):
    id: str
    requestId: Optional[str] = None
    customerId: str
    customer: str
    admin: str
    action: str
    field: str
    previous: Optional[str] = None
    next: Optional[str] = None
    reason: str
    timestamp: str


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=72)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
            raise ValueError("Enter a valid email address.")
        return normalized


class RegisterRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    full_name: str = Field(alias="fullName", min_length=2, max_length=255)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=72)
    confirm_password: str = Field(alias="confirmPassword", min_length=6, max_length=72)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Full name is required.")
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
            raise ValueError("Enter a valid email address.")
        return normalized

    @field_validator("password")
    @classmethod
    def validate_password_policy(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be no longer than 72 bytes.")
        if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
            raise ValueError("Password must include at least one letter and one number.")
        return value

    @field_validator("confirm_password")
    @classmethod
    def validate_confirmation_policy(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be no longer than 72 bytes.")
        return value

    def passwords_match(self) -> bool:
        return self.password == self.confirm_password


class UserResponse(BaseModel):
    id: str
    userId: str
    role: str
    name: str
    email: str


class LoginResponse(BaseModel):
    token: str
    role: str
    name: str
    userId: str
    email: str


class RegisterResponse(BaseModel):
    message: str
    user: UserResponse


class CustomerProfileResponse(BaseModel):
    customerId: str
    name: str
    email: str
    dob: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    kycStatus: str


class SubmitDocumentsRequest(BaseModel):
    files: List[str] = Field(default_factory=list)
    customerId: Optional[str] = None


class UpdateAndProcessRequest(BaseModel):
    field: str
    value: str
    reason: str
    adminName: Optional[str] = None


class RejectRequest(BaseModel):
    reason: str
    adminName: Optional[str] = None


class ProcessRequest(BaseModel):
    adminName: Optional[str] = None
