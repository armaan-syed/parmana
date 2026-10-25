from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.database.connection import check_db_connection

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Pramana" in data["service"]


def test_health_endpoint_when_db_online():
    mock_status = {
        "connected": True,
        "message": "Database connection successful.",
    }
    with patch("app.main.check_db_connection", return_value=mock_status):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert data["database"] is True
        assert data["database_message"] == "Database connection successful."


def test_health_endpoint_when_db_offline():
    mock_status = {
        "connected": False,
        "message": "Database unreachable: Connection refused",
    }
    with patch("app.main.check_db_connection", return_value=mock_status):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert data["database"] is False
        assert "Database unreachable" in data["database_message"]


def test_auth_login():
    mock_db = MagicMock()
    mock_user = MagicMock()
    mock_user.role = "customer"
    mock_user.full_name = "Anaya Rao"
    mock_user.user_id = "CUS-1042"
    mock_user.email = "anaya.rao@example.test"
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    from app.database import get_db
    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        response = client.post("/auth/login", json={"role": "customer"})
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "customer"
        assert data["userId"] == "CUS-1042"
    finally:
        app.dependency_overrides.clear()


def test_check_db_connection_success():
    mock_engine = MagicMock()
    mock_conn = MagicMock()
    mock_engine.connect.return_value.__enter__.return_value = mock_conn

    with patch("app.database.connection.get_engine", return_value=mock_engine):
        result = check_db_connection()
        assert result["connected"] is True
        assert result["message"] == "Database connection successful."


def test_check_db_connection_failure():
    mock_engine = MagicMock()
    mock_engine.connect.side_effect = Exception("Connection timed out")

    with patch("app.database.connection.get_engine", return_value=mock_engine):
        result = check_db_connection()
        assert result["connected"] is False
        assert "Connection timed out" in result["message"]
