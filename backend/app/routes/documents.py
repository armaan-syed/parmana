import time
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.kyc import Customer, KycRequest, Document
from app.schemas.kyc import SubmitDocumentsRequest

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/submit")
def submit_documents(payload: SubmitDocumentsRequest, db: Session = Depends(get_db)):
    """
    Simulates document upload and KYC submission.
    Creates or updates the customer KYC request in PostgreSQL.
    """
    customer_id = payload.customerId or "CUS-1042"
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

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

    today = "12 Oct 2026"
    existing_req = db.query(KycRequest).filter(KycRequest.customer_id == customer_id).first()

    if existing_req:
        existing_req.status = "SUBMITTED"
        existing_req.documents_list = files
        existing_req.submitted_at = today
        existing_req.updated_at = today
        existing_req.reason = None
        customer.kyc_status = "SUBMITTED"
        db.commit()
        return {"requestId": existing_req.request_id, "status": "SUBMITTED", "message": "KYC documents submitted successfully."}

    new_id = f"KYC-{str(int(time.time()))[-4:]}"
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
