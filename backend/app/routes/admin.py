from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.kyc import Customer, KycRequest, AuditLog
from app.schemas.kyc import (
    KycRequestResponse,
    AuditEventResponse,
    ProcessRequest,
    UpdateAndProcessRequest,
    RejectRequest,
)

router = APIRouter(prefix="/admin", tags=["Admin & Verification Workflow"])


@router.get("/requests", response_model=List[KycRequestResponse])
def get_all_requests(db: Session = Depends(get_db)):
    """
    Returns list of all KYC requests in the queue for administrator review.
    """
    requests = db.query(KycRequest).order_by(KycRequest.id.asc()).all()
    results = []
    for req in requests:
        customer = db.query(Customer).filter(Customer.customer_id == req.customer_id).first()
        results.append(
            KycRequestResponse(
                id=req.request_id,
                customerId=req.customer_id,
                name=customer.name if customer else "Customer",
                email=customer.email if customer else "",
                status=req.status,
                submitted=req.submitted_at,
                updated=req.updated_at,
                documents=req.documents_list or [],
                fields=req.fields_data or [],
                reason=req.reason,
            )
        )
    return results


@router.get("/requests/{request_id}", response_model=KycRequestResponse)
def get_request_by_id(request_id: str, db: Session = Depends(get_db)):
    """
    Returns single KYC request by request ID (e.g. 'KYC-2841').
    """
    req = db.query(KycRequest).filter(KycRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail=f"Request {request_id} not found.")

    customer = db.query(Customer).filter(Customer.customer_id == req.customer_id).first()
    return KycRequestResponse(
        id=req.request_id,
        customerId=req.customer_id,
        name=customer.name if customer else "Customer",
        email=customer.email if customer else "",
        status=req.status,
        submitted=req.submitted_at,
        updated=req.updated_at,
        documents=req.documents_list or [],
        fields=req.fields_data or [],
        reason=req.reason,
    )


@router.post("/requests/{request_id}/process")
def process_request(request_id: str, payload: ProcessRequest = None, db: Session = Depends(get_db)):
    """
    Approves and verifies a clean matching KYC case.
    """
    req = db.query(KycRequest).filter(KycRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    fields = req.fields_data or []
    # Verify whether any fields mismatch
    if any(f.get("result") != "MATCH" for f in fields):
        raise HTTPException(
            status_code=400,
            detail="Cannot directly process: request has mismatched or uncertain fields. Use Update & Process instead.",
        )

    admin_name = payload.adminName if payload and payload.adminName else "Nisha Verma"
    previous_status = req.status
    req.status = "VERIFIED"
    req.updated_at = "12 Oct 2026"

    customer = db.query(Customer).filter(Customer.customer_id == req.customer_id).first()
    if customer:
        customer.kyc_status = "VERIFIED"

    # Insert immutable audit entry
    audit = AuditLog(
        audit_id=f"AUD-{str(req.id).zfill(4)}",
        request_id=req.request_id,
        customer_id=req.customer_id,
        customer_name=customer.name if customer else "Customer",
        admin_name=admin_name,
        action="Request verified",
        field="KYC status",
        previous_value=previous_status.replace("_", " ").title(),
        next_value="Verified",
        reason="All required fields reviewed and matched.",
        timestamp="12 Oct 2026 · 15:00",
    )
    db.add(audit)
    db.commit()

    return {"status": "VERIFIED", "message": "KYC request successfully verified."}


@router.post("/requests/{request_id}/update-and-process")
def update_and_process_request(request_id: str, payload: UpdateAndProcessRequest, db: Session = Depends(get_db)):
    """
    Updates an outdated customer field based on valid document evidence and verifies the request.
    Creates an immutable audit log of the change.
    """
    req = db.query(KycRequest).filter(KycRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    customer = db.query(Customer).filter(Customer.customer_id == req.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    field_name = payload.field
    new_value = payload.value
    reason = payload.reason
    admin_name = payload.adminName or "Nisha Verma"

    # Find the target field in comparison fields
    fields = list(req.fields_data or [])
    previous_val = ""
    updated = False

    for item in fields:
        if item.get("label", "").lower() == field_name.lower():
            previous_val = item.get("existing", "")
            item["existing"] = new_value
            item["extracted"] = new_value
            item["result"] = "MATCH"
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=400, detail=f"Field '{field_name}' not found in verification comparison.")

    # Update customer table record if matching
    if "name" in field_name.lower():
        customer.name = new_value
    elif "dob" in field_name.lower() or "birth" in field_name.lower():
        customer.dob = new_value
    elif "address" in field_name.lower():
        customer.address = new_value

    all_matched = all(f.get("result") == "MATCH" for f in fields)
    req.fields_data = fields
    req.status = "VERIFIED" if all_matched else "UNDER_REVIEW"
    req.updated_at = "12 Oct 2026"
    if all_matched:
        customer.kyc_status = "VERIFIED"

    # Insert immutable audit record
    audit = AuditLog(
        audit_id=f"AUD-{str(int(time.time() * 1000))[-5:]}" if "time" in locals() else f"AUD-{req.request_id[-4:]}",
        request_id=req.request_id,
        customer_id=req.customer_id,
        customer_name=customer.name,
        admin_name=admin_name,
        action="Record corrected & verified" if all_matched else "Record corrected",
        field=field_name,
        previous_value=previous_val,
        next_value=new_value,
        reason=reason,
        timestamp="12 Oct 2026 · 15:30",
    )
    db.add(audit)
    db.commit()

    return {
        "status": req.status,
        "message": f"Field '{field_name}' updated successfully in database and audit logged.",
        "resolved": all_matched,
    }


@router.post("/requests/{request_id}/reject")
def reject_request(request_id: str, payload: RejectRequest, db: Session = Depends(get_db)):
    """
    Rejects a KYC request with a mandatory reason.
    """
    req = db.query(KycRequest).filter(KycRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    customer = db.query(Customer).filter(Customer.customer_id == req.customer_id).first()
    admin_name = payload.adminName or "Nisha Verma"
    prev_status = req.status

    req.status = "REJECTED"
    req.reason = payload.reason
    req.updated_at = "12 Oct 2026"
    if customer:
        customer.kyc_status = "REJECTED"

    audit = AuditLog(
        audit_id=f"AUD-{req.request_id[-4:]}R",
        request_id=req.request_id,
        customer_id=req.customer_id,
        customer_name=customer.name if customer else "Customer",
        admin_name=admin_name,
        action="Request rejected",
        field="KYC status",
        previous_value=prev_status.replace("_", " ").title(),
        next_value="Rejected",
        reason=payload.reason,
        timestamp="12 Oct 2026 · 16:00",
    )
    db.add(audit)
    db.commit()

    return {"status": "REJECTED", "message": "KYC request rejected and audit trail updated."}
