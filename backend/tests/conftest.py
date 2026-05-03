"""Conftest — shared fixtures for backend tests."""
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def mock_firestore():
    """Mock Firestore client for all tests."""
    mock_db = MagicMock()
    with patch("app.firestore.get_db", return_value=mock_db):
        yield mock_db


@pytest.fixture
def client(mock_firestore):
    from app.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_token():
    """Generate a valid JWT for testing."""
    import jwt
    from app.config import settings
    from datetime import datetime, timezone
    token = jwt.encode(
        {"sub": "+919999999999", "phone": "+919999999999",
         "exp": datetime.now(timezone.utc).timestamp() + 3600},
        settings.jwt_secret, algorithm=settings.jwt_algorithm,
    )
    return token


@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}
