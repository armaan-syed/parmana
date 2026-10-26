from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.kyc import Customer, KycRequest, Document, User
from app.schemas.kyc import SubmitDocumentsRequest
from app.security import get_current_user

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/submit")
def submit_documents(
    payload: SubmitDocumentsRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Simulates document upload and KYC submission.
    Creates or updates the customer KYC request in PostgreSQL.
    """
    if user.role != "customer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer access required.")
    customer = db.query(Customer).filter(Customer.user_id == user.id).first()
    if customer is None:
        customer = db.query(Customer).filter(Customer.customer_id == user.user_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer_id = customer.customer_id

    files = payload.files if payload.files else ["Aadhaar", "Voter ID"]

    # Record document metadata
    for doc_type in files:
        doc = Document(
            customer_id=customer_id,
            document_type=doc_type,
            filename=f"{doc_type.lower().replace(' ', '_')}_upload.pdf",
            status="UPLOADED",
        )
        db.add(doc)

    today = datetime.now(timezone.utc).strftime("%d %b %Y")
    existing_req = (
        db.query(KycRequest)
        .filter(KycRequest.customer_id == customer_id)
        .order_by(KycRequest.id.desc())
        .first()
    )

    if existing_req:
        existing_req.status = "SUBMITTED"
        existing_req.documents_list = files
        existing_req.submitted_at = today
        existing_req.updated_at = today
        existing_req.reason = None
        customer.kyc_status = "SUBMITTED"
        db.commit()
        return {"requestId": existing_req.request_id, "status": "SUBMITTED", "message": "KYC documents submitted successfully."}

    new_id = f"KYC-{uuid4().hex[:12].upper()}"
    new_req = KycRequest(
        request_id=new_id,
        customer_id=customer_id,
        status="SUBMITTED",
        submitted_at=today,
        updated_at=today,
        documents_list=files,
        fields_data=[
            {"label": "Full name", "existing": customer.name, "extracted": customer.name, "result": "MATCH"},
            {"label": "Date of birth", "existing": customer.dob or "14 Mar 1994", "extracted": customer.dob or "14 Mar 1994", "result": "MATCH"},
            {"label": "Address", "existing": customer.address or "18 Lake View Rd, Pune", "extracted": customer.address or "18 Lake View Rd, Pune", "result": "MATCH"},
            {"label": "Document number", "existing": "XXXX XXXX 4821", "extracted": "XXXX XXXX 4821", "result": "MATCH"},
        ],
    )
    customer.kyc_status = "SUBMITTED"
    db.add(new_req)
    db.commit()

    return {"requestId": new_id, "status": "SUBMITTED", "message": "KYC documents submitted successfully."}
