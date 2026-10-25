from typing import List, Optional
from pydantic import BaseModel, Field


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
    role: str = Field(..., description="Role: 'customer' or 'admin'")
    email: Optional[str] = None
    password: Optional[str] = None


class LoginResponse(BaseModel):
    token: str
    role: str
    name: str
    userId: str
    email: str


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
    customerId: Optional[str] = "CUS-1042"


class UpdateAndProcessRequest(BaseModel):
    field: str
    value: str
    reason: str
    adminName: Optional[str] = "Nisha Verma"


class RejectRequest(BaseModel):
    reason: str
    adminName: Optional[str] = "Nisha Verma"


class ProcessRequest(BaseModel):
    adminName: Optional[str] = "Nisha Verma"
