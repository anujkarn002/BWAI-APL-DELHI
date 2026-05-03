"""Auth endpoint tests."""
from unittest.mock import MagicMock


def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_request_otp(client, mock_firestore):
    r = client.post("/api/auth/request-otp", json={"phone": "+919876543210"})
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_verify_master_otp(client, mock_firestore):
    # Mock user doc doesn't exist → should create
    mock_doc = MagicMock()
    mock_doc.exists = False
    mock_firestore.collection.return_value.document.return_value.get.return_value = mock_doc

    r = client.post("/api/auth/verify-otp", json={"phone": "+919876543210", "otp": "999999"})
    assert r.status_code == 200
    body = r.json()
    assert "token" in body
    assert body["user_id"] == "+919876543210"


def test_verify_bad_otp(client, mock_firestore):
    mock_doc = MagicMock()
    mock_doc.exists = False
    mock_firestore.collection.return_value.document.return_value.get.return_value = mock_doc

    r = client.post("/api/auth/verify-otp", json={"phone": "+919876543210", "otp": "000000"})
    assert r.status_code == 401


def test_protected_route_no_token(client):
    r = client.get("/api/foods")
    assert r.status_code == 401


def test_protected_route_with_token(client, auth_headers, mock_firestore):
    mock_firestore.collection.return_value.where.return_value.where.return_value.stream.return_value = []
    r = client.get("/api/foods", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []
