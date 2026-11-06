import pytest
from app.core.config import settings
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.models.workspace import Workspace


def test_user_registration(client, db_session):
    """Test standard user registration and automatic workspace creation."""
    payload = {
        "full_name": "Alice Walker",
        "email": "alice@agentos.ai",
        "password": "SuperSecretPassword123!",
        "confirm_password": "SuperSecretPassword123!",
        "terms_accepted": True,
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "alice@agentos.ai"
    assert data["user"]["full_name"] == "Alice Walker"
    assert "workspace" in data
    assert data["workspace"]["name"] == "Alice Walker's Workspace"
    assert data["workspace"]["user_id"] == data["user"]["id"]

    # Verify cookie is set
    assert settings.REFRESH_TOKEN_COOKIE_NAME in response.cookies

    # Verify user in database
    db_user = db_session.query(User).filter(User.email == "alice@agentos.ai").first()
    assert db_user is not None
    assert db_user.password_hash.startswith("$argon2")

    # Verify workspace in database
    db_workspace = db_session.query(Workspace).filter(Workspace.user_id == db_user.id).first()
    assert db_workspace is not None
    assert db_workspace.name == "Alice Walker's Workspace"


def test_registration_duplicate_email(client):
    """Test duplicate email rejection."""
    payload = {
        "full_name": "Bob Vance",
        "email": "bob@agentos.ai",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "terms_accepted": True,
    }
    resp1 = client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 201

    # Attempt to register again with same email (case variation)
    payload["email"] = "BOB@agentos.ai"
    resp2 = client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code == 400
    assert "already exists" in resp2.json()["detail"]


def test_registration_validation_errors(client):
    """Test validation errors for password mismatch and terms acceptance."""
    # Password mismatch
    mismatch_payload = {
        "full_name": "Charlie Day",
        "email": "charlie@agentos.ai",
        "password": "Password123!",
        "confirm_password": "DifferentPassword123!",
        "terms_accepted": True,
    }
    resp = client.post("/api/v1/auth/register", json=mismatch_payload)
    assert resp.status_code == 422

    # Terms not accepted
    terms_payload = {
        "full_name": "Charlie Day",
        "email": "charlie2@agentos.ai",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "terms_accepted": False,
    }
    resp2 = client.post("/api/v1/auth/register", json=terms_payload)
    assert resp2.status_code == 422


def test_user_login_success(client):
    """Test user login with valid credentials."""
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Dana Scully",
            "email": "dana@agentos.ai",
            "password": "TrustNoOne123!",
            "confirm_password": "TrustNoOne123!",
            "terms_accepted": True,
        },
    )

    # Login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": "dana@agentos.ai",
            "password": "TrustNoOne123!",
            "remember_me": True,
        },
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "dana@agentos.ai"
    assert data["workspace"]["name"] == "Dana Scully's Workspace"
    assert settings.REFRESH_TOKEN_COOKIE_NAME in login_resp.cookies


def test_user_login_invalid_password_and_email(client):
    """Test login failure on bad password and nonexistent email."""
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Fox Mulder",
            "email": "fox@agentos.ai",
            "password": "IWantToBelieve123!",
            "confirm_password": "IWantToBelieve123!",
            "terms_accepted": True,
        },
    )

    # Wrong password
    resp1 = client.post(
        "/api/v1/auth/login",
        json={"email": "fox@agentos.ai", "password": "WrongPassword"},
    )
    assert resp1.status_code == 401
    assert "Incorrect email or password" in resp1.json()["detail"]

    # Nonexistent email
    resp2 = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@agentos.ai", "password": "SomePassword"},
    )
    assert resp2.status_code == 401


def test_jwt_authentication_me_endpoint(client):
    """Test accessing protected /me endpoint with JWT."""
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Grace Hopper",
            "email": "grace@agentos.ai",
            "password": "CompilersRule123!",
            "confirm_password": "CompilersRule123!",
            "terms_accepted": True,
        },
    )
    token = reg_resp.json()["access_token"]

    # Access /me without token -> 401
    unauth_resp = client.get("/api/v1/auth/me")
    assert unauth_resp.status_code == 401

    # Access /me with invalid token -> 401
    invalid_resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert invalid_resp.status_code == 401

    # Access /me with valid token -> 200
    auth_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert auth_resp.status_code == 200
    me_data = auth_resp.json()
    assert me_data["user"]["email"] == "grace@agentos.ai"
    assert me_data["workspace"]["name"] == "Grace Hopper's Workspace"


def test_refresh_token_rotation(client, db_session):
    """Test rotating refresh token and token revocation on rotation."""
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Ada Lovelace",
            "email": "ada@agentos.ai",
            "password": "FirstProgrammer123!",
            "confirm_password": "FirstProgrammer123!",
            "terms_accepted": True,
        },
    )
    first_cookie = reg_resp.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    assert first_cookie is not None

    # Rotate token via POST /refresh
    client.cookies.set(settings.REFRESH_TOKEN_COOKIE_NAME, first_cookie)
    refresh_resp = client.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 200
    refresh_data = refresh_resp.json()
    assert "access_token" in refresh_data
    assert refresh_data["user"]["email"] == "ada@agentos.ai"

    # Verify new cookie is set and is different from old one
    second_cookie = refresh_resp.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    assert second_cookie is not None
    assert second_cookie != first_cookie

    # Attempt to reuse the first (now revoked) refresh token -> detection!
    client.cookies.set(settings.REFRESH_TOKEN_COOKIE_NAME, first_cookie)
    reuse_resp = client.post("/api/v1/auth/refresh")
    assert reuse_resp.status_code == 401
    assert "reuse detected" in reuse_resp.json()["detail"].lower()


def test_logout_and_revocation(client, db_session):
    """Test logout revokes token in DB and clears cookie."""
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Alan Turing",
            "email": "alan@agentos.ai",
            "password": "EnigmaCracker123!",
            "confirm_password": "EnigmaCracker123!",
            "terms_accepted": True,
        },
    )
    cookie = reg_resp.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    client.cookies.set(settings.REFRESH_TOKEN_COOKIE_NAME, cookie)

    logout_resp = client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200
    assert logout_resp.json()["message"] == "Successfully logged out."

    # Verify subsequent refresh attempt fails
    client.cookies.set(settings.REFRESH_TOKEN_COOKIE_NAME, cookie)
    retry_refresh = client.post("/api/v1/auth/refresh")
    assert retry_refresh.status_code == 401

