from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.kyc import Customer, User
from app import cli


@pytest.fixture
def auth_client(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    test_sessions = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_get_db():
        db = test_sessions()
        try:
            yield db
        finally:
            db.close()

    monkeypatch.setattr(
        "app.security.get_settings",
        lambda: SimpleNamespace(
            SECRET_KEY="test-secret-value-with-more-than-32-random-looking-characters",
            ALGORITHM="HS256",
            ACCESS_TOKEN_EXPIRE_MINUTES=60,
        ),
    )
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app), test_sessions
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def register(client: TestClient, **overrides):
    payload = {
        "fullName": "Test Customer",
        "email": "customer@example.com",
        "password": "SecurePassword123",
        "confirmPassword": "SecurePassword123",
    }
    payload.update(overrides)
    return client.post("/auth/register", json=payload)


def test_registration_hashes_password_and_ignores_requested_role(auth_client):
    client, sessions = auth_client
    response = register(client, role="admin")

    assert response.status_code == 201
    data = response.json()
    assert data["user"]["role"] == "customer"
    assert data["user"]["email"] == "customer@example.com"
    with sessions() as db:
        user = db.query(User).filter_by(email="customer@example.com").one()
        customer = db.query(Customer).filter_by(user_id=user.id).one()
        assert user.password_hash != "SecurePassword123"
        assert user.password_hash
        assert customer.customer_id == user.user_id
        assert customer.email == user.email


def test_registration_accepts_six_character_password(auth_client):
    client, _ = auth_client
    response = register(client, password="Abc123", confirmPassword="Abc123")

    assert response.status_code == 201


def test_registration_rejects_duplicate_email_case_insensitively(auth_client):
    client, _ = auth_client
    assert register(client).status_code == 201
    duplicate = register(client, email="CUSTOMER@example.com")
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "An account with this email already exists."


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"email": "not-an-email"}, "valid email"),
        ({"password": "short", "confirmPassword": "short"}, "at least 6"),
        ({"confirmPassword": "DifferentPassword456"}, "do not match"),
    ],
)
def test_registration_validates_inputs(auth_client, overrides, message):
    client, _ = auth_client
    response = register(client, **overrides)
    assert response.status_code == 422
    assert message.lower() in response.text.lower()


def test_admin_provisioning_cli_sets_admin_role_and_hash(auth_client, monkeypatch):
    _, sessions = auth_client
    engine = sessions.kw["bind"]
    prompts = iter(["provisioned@example.com", "Provisioned Admin"])
    passwords = iter(["AnotherSecure123", "AnotherSecure123"])
    monkeypatch.setattr("builtins.input", lambda _: next(prompts))
    monkeypatch.setattr(cli.getpass, "getpass", lambda _: next(passwords))
    monkeypatch.setattr(cli, "get_engine", lambda: engine)
    monkeypatch.setattr(cli, "SessionLocal", sessions)

    assert cli.create_admin() == 0
    with sessions() as db:
        admin = db.query(User).filter_by(email="provisioned@example.com").one()
        assert admin.role == "admin"
        assert admin.password_hash != "AnotherSecure123"


def test_login_and_me_validate_database_credentials(auth_client):
    client, _ = auth_client
    assert register(client).status_code == 201

    wrong_password = client.post(
        "/auth/login",
        json={"email": "customer@example.com", "password": "IncorrectPassword123"},
    )
    assert wrong_password.status_code == 401
    assert wrong_password.json()["detail"] == "Invalid email or password."

    login = client.post(
        "/auth/login",
        json={"email": "CUSTOMER@example.com", "password": "SecurePassword123"},
    )
    assert login.status_code == 200
    identity = login.json()
    assert identity["role"] == "customer"
    assert identity["email"] == "customer@example.com"

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {identity['token']}"})
    assert me.status_code == 200
    assert me.json()["userId"] == identity["userId"]
    assert client.get("/auth/me").status_code == 401
    assert client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    ).status_code == 401


def test_customer_data_is_scoped_and_admin_apis_require_admin(auth_client):
    client, sessions = auth_client
    assert register(client).status_code == 201
    login = client.post(
        "/auth/login",
        json={"email": "customer@example.com", "password": "SecurePassword123"},
    ).json()
    customer_headers = {"Authorization": f"Bearer {login['token']}"}

    profile = client.get(
        "/customer/profile?customer_id=some-other-customer",
        headers=customer_headers,
    )
    assert profile.status_code == 200
    assert profile.json()["customerId"] == login["userId"]
    submission = client.post(
        "/documents/submit",
        json={"customerId": "some-other-customer", "files": ["Proof"]},
        headers=customer_headers,
    )
    assert submission.status_code == 200
    with sessions() as db:
        document = db.query(Customer).filter_by(customer_id=login["userId"]).one()
        assert document.documents[0].document_type == "Proof"

    assert client.get("/admin/requests", headers=customer_headers).status_code == 403
    assert client.get("/audit/logs", headers=customer_headers).status_code == 403

    with sessions() as db:
        admin = User(
            user_id="ADM-" + "A" * 12,
            email="admin@example.com",
            full_name="Authorized Admin",
            role="admin",
            password_hash=(
                db.query(User).filter_by(email="customer@example.com").one().password_hash
            ),
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    admin_login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "SecurePassword123"},
    )
    assert admin_login.status_code == 200
    assert admin_login.json()["role"] == "admin"

    admin_headers = {"Authorization": f"Bearer {admin_login.json()['token']}"}
    assert client.get("/admin/requests", headers=admin_headers).status_code == 200
    assert client.get("/customer/list", headers=admin_headers).status_code == 200
