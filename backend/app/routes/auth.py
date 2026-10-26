from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.kyc import Customer, User
from app.schemas.kyc import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    UserResponse,
)
from app.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


def serialize_user(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        userId=user.user_id,
        role=user.role,
        name=user.full_name,
        email=user.email,
    )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if not payload.passwords_match():
        raise HTTPException(status_code=422, detail="Password and confirmation do not match.")
    existing = db.query(User).filter(func.lower(User.email) == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user_id = f"CUS-{uuid4().hex[:12].upper()}"
    user = User(
        user_id=user_id,
        email=payload.email,
        full_name=payload.full_name,
        role="customer",
        password_hash=hash_password(payload.password),
    )
    customer = Customer(
        customer_id=user_id,
        user=user,
        name=payload.full_name,
        email=payload.email,
        kyc_status="SUBMITTED",
    )
    try:
        db.add_all([user, customer])
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        ) from None
    except Exception:
        db.rollback()
        raise

    return RegisterResponse(message="Account created successfully. You can now sign in.", user=serialize_user(user))


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        token = create_access_token(user)
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured on this server.",
        ) from None
    return LoginResponse(
        token=token,
        role=user.role,
        name=user.full_name,
        userId=user.user_id,
        email=user.email,
    )


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return serialize_user(user)
