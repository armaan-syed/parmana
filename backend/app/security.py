from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.kyc import User

password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)


def validate_signing_key() -> None:
    settings = get_settings()
    if (
        len(settings.SECRET_KEY) < 32
        or settings.SECRET_KEY == "insecure_dev_secret_key_change_in_env_file"
        or settings.SECRET_KEY.startswith("change_this_to_a_secure")
        or settings.SECRET_KEY.startswith("replace-with-a-random")
    ):
        raise RuntimeError("Configure a random SECRET_KEY of at least 32 characters before issuing tokens.")


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, stored_hash: str | None) -> bool:
    return bool(stored_hash and password_hasher.verify(password, stored_hash))


def create_access_token(user: User) -> str:
    validate_signing_key()
    settings = get_settings()

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(
        {"sub": str(user.id), "exp": expires_at},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None:
        raise unauthorized()
    try:
        validate_signing_key()
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured on this server.",
        ) from None
    settings = get_settings()
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise unauthorized() from None

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise unauthorized()
    return user


def require_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required.")
    return user
