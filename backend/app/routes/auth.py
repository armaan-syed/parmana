from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.kyc import User, Customer
from app.schemas.kyc import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Simulates role-based login for customer or admin and returns user session info.
    """
    role = payload.role.lower()
    if role not in ["customer", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role specified. Must be 'customer' or 'admin'.")

    # Find demo user matching role
    user = db.query(User).filter(User.role == role).first()
    if not user:
        # Fallback response
        return LoginResponse(
            token=f"mock-{role}-token-{role}",
            role=role,
            name="Anaya Rao" if role == "customer" else "Nisha Verma",
            userId="CUS-1042" if role == "customer" else "ADM-001",
            email="anaya.rao@example.test" if role == "customer" else "admin@pramana.test",
        )

    return LoginResponse(
        token=f"mock-{user.role}-jwt-token",
        role=user.role,
        name=user.full_name,
        userId=user.user_id,
        email=user.email,
    )
