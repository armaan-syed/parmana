from unittest.mock import MagicMock, patch
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


def test_auth_login_requires_credentials():
    response = client.post("/auth/login", json={"role": "customer"})
    assert response.status_code == 422


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
