from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.kyc import Customer, KycRequest, User
from app.schemas.kyc import CustomerProfileResponse, KycRequestResponse
from app.security import get_current_user, require_admin

router = APIRouter(prefix="/customer", tags=["Customer"])


def _customer_for_user(db: Session, user: User) -> Customer:
    customer = db.query(Customer).filter(Customer.user_id == user.id).first()
    if customer is None:
        customer = db.query(Customer).filter(Customer.customer_id == user.user_id).first()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer profile not found.")
    return customer


@router.get("/profile", response_model=CustomerProfileResponse)
def get_customer_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns customer profile data and current KYC verification status.
    """
    if user.role != "customer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer access required.")
    customer = _customer_for_user(db, user)

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
def get_customer_kyc_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns latest submitted KYC request details for the customer.
    """
    if user.role != "customer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer access required.")
    customer = _customer_for_user(db, user)
    req = db.query(KycRequest).filter(KycRequest.customer_id == customer.customer_id).order_by(KycRequest.id.desc()).first()
    if not req:
        raise HTTPException(status_code=404, detail="No KYC request found for this customer.")

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
def list_customers(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
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
