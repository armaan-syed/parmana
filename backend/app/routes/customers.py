from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.kyc import Customer, KycRequest
from app.schemas.kyc import CustomerProfileResponse, KycRequestResponse

router = APIRouter(prefix="/customer", tags=["Customer"])


@router.get("/profile", response_model=CustomerProfileResponse)
def get_customer_profile(customer_id: str = "CUS-1042", db: Session = Depends(get_db)):
    """
    Returns customer profile data and current KYC verification status.
    """
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    return CustomerProfileResponse(
        customerId=customer.customer_id,
        name=customer.name,
        email=customer.email,
        dob=customer.dob,
        gender=customer.gender,
        address=customer.address,
        phone=customer.phone,
        kycStatus=customer.kyc_status,
    )


@router.get("/status", response_model=KycRequestResponse)
def get_customer_kyc_status(customer_id: str = "CUS-1042", db: Session = Depends(get_db)):
    """
    Returns latest submitted KYC request details for the customer.
    """
    req = db.query(KycRequest).filter(KycRequest.customer_id == customer_id).order_by(KycRequest.id.desc()).first()
    if not req:
        raise HTTPException(status_code=404, detail="No KYC request found for this customer.")

    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
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


@router.get("/list", response_model=List[CustomerProfileResponse])
def list_customers(db: Session = Depends(get_db)):
    """
    Lists all registered customers in the database.
    """
    customers = db.query(Customer).order_by(Customer.id.asc()).all()
    return [
        CustomerProfileResponse(
            customerId=c.customer_id,
            name=c.name,
            email=c.email,
            dob=c.dob,
            gender=c.gender,
            address=c.address,
            phone=c.phone,
            kycStatus=c.kyc_status,
        )
        for c in customers
    ]
