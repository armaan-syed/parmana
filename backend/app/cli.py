import argparse
import getpass
import re
import sys
from uuid import uuid4

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app.database import Base, SessionLocal, ensure_user_email_index, get_engine
from app.models.kyc import User
from app.security import hash_password, validate_signing_key


def create_admin() -> int:
    try:
        validate_signing_key()
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        return 1

    email = input("Admin email: ").strip().lower()
    full_name = input("Admin full name: ").strip()
    password = getpass.getpass("Admin password (12+ characters): ")
    confirmation = getpass.getpass("Confirm password: ")

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        print("Enter a valid email address.", file=sys.stderr)
        return 1
    if len(full_name) < 2:
        print("Full name must contain at least 2 characters.", file=sys.stderr)
        return 1
    if len(password) < 12 or len(password.encode("utf-8")) > 72:
        print("Password must be between 12 and 72 UTF-8 bytes.", file=sys.stderr)
        return 1
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        print("Password must include at least one letter and one number.", file=sys.stderr)
        return 1
    if password != confirmation:
        print("Passwords do not match.", file=sys.stderr)
        return 1

    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    ensure_user_email_index(engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(func.lower(User.email) == email).first()
        if existing:
            if existing.role != "admin" or existing.password_hash:
                print("An account with this email already exists.", file=sys.stderr)
                return 1
            existing.full_name = full_name
            existing.password_hash = hash_password(password)
            db.commit()
            print(f"Administrator password provisioned for {email}.")
            return 0
        admin = User(
            user_id=f"ADM-{uuid4().hex[:12].upper()}",
            email=email,
            full_name=full_name,
            role="admin",
            password_hash=hash_password(password),
        )
        db.add(admin)
        db.commit()
        print(f"Administrator account created for {email}.")
        return 0
    except IntegrityError:
        db.rollback()
        print("An account with this email already exists.", file=sys.stderr)
        return 1
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Pramāṇa administrative account provisioning.")
    parser.add_argument("command", choices=["create-admin"])
    args = parser.parse_args()
    if args.command == "create-admin":
        return create_admin()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
