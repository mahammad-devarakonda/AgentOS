import pytest


def test_user_workspace_isolation(client):
    """
    Test personal workspace isolation:
    Ensure User B cannot read, list, create, or modify User A's workspace resources.
    """
    # 1. Register User A
    user_a_reg = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "User Alpha",
            "email": "alpha@agentos.ai",
            "password": "PasswordAlpha123!",
            "confirm_password": "PasswordAlpha123!",
            "terms_accepted": True,
        },
    )
    assert user_a_reg.status_code == 201
    token_a = user_a_reg.json()["access_token"]
    workspace_a_id = user_a_reg.json()["workspace"]["id"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register User B
    user_b_reg = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "User Beta",
            "email": "beta@agentos.ai",
            "password": "PasswordBeta123!",
            "confirm_password": "PasswordBeta123!",
            "terms_accepted": True,
        },
    )
    assert user_b_reg.status_code == 201
    token_b = user_b_reg.json()["access_token"]
    workspace_b_id = user_b_reg.json()["workspace"]["id"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Ensure workspaces are distinct
    assert workspace_a_id != workspace_b_id

    # 3. User A creates a project and an agent in their personal workspace
    create_proj_resp = client.post(
        f"/api/v1/workspaces/{workspace_a_id}/projects",
        headers=headers_a,
        json={"name": "Alpha Autonomous Workflow", "description": "Confidential AI project"},
    )
    assert create_proj_resp.status_code == 201
    project_a_id = create_proj_resp.json()["id"]

    create_agent_resp = client.post(
        f"/api/v1/workspaces/{workspace_a_id}/agents",
        headers=headers_a,
        json={"name": "Alpha Sentinel", "role": "Security Monitor"},
    )
    assert create_agent_resp.status_code == 201
    agent_a_id = create_agent_resp.json()["id"]

    # 4. User A can list and view their own project and agent
    list_a_proj = client.get(f"/api/v1/workspaces/{workspace_a_id}/projects", headers=headers_a)
    assert list_a_proj.status_code == 200
    assert len(list_a_proj.json()) == 1
    assert list_a_proj.json()[0]["id"] == project_a_id

    list_a_agents = client.get(f"/api/v1/workspaces/{workspace_a_id}/agents", headers=headers_a)
    assert list_a_agents.status_code == 200
    assert len(list_a_agents.json()) == 1

    # 5. User B attempts to access User A's workspace metadata -> 403 Forbidden
    unauth_workspace_resp = client.get(f"/api/v1/workspaces/{workspace_a_id}", headers=headers_b)
    assert unauth_workspace_resp.status_code == 403
    assert "access to this workspace" in unauth_workspace_resp.json()["detail"].lower()

    # 6. User B attempts to list User A's projects -> 403 Forbidden
    unauth_list_proj = client.get(f"/api/v1/workspaces/{workspace_a_id}/projects", headers=headers_b)
    assert unauth_list_proj.status_code == 403

    # 7. User B attempts to retrieve User A's specific project -> 403 Forbidden
    unauth_get_proj = client.get(
        f"/api/v1/workspaces/{workspace_a_id}/projects/{project_a_id}",
        headers=headers_b,
    )
    assert unauth_get_proj.status_code == 403

    # 8. User B attempts to inject a project into User A's workspace -> 403 Forbidden
    unauth_inject_proj = client.post(
        f"/api/v1/workspaces/{workspace_a_id}/projects",
        headers=headers_b,
        json={"name": "Malicious Project"},
    )
    assert unauth_inject_proj.status_code == 403

    # 9. User B's own workspace is completely isolated and empty initially
    user_b_projects = client.get(f"/api/v1/workspaces/{workspace_b_id}/projects", headers=headers_b)
    assert user_b_projects.status_code == 200
    assert len(user_b_projects.json()) == 0

