# FastAPI Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the first FastAPI backend foundation for CALLAB RENEWAL while keeping the Next.js frontend unchanged.

**Architecture:** Add a separate `backend/` Python service with FastAPI routes under `/api`. The first slice includes application creation, settings loading, health checks, and legacy role mapping so later Oracle-backed auth can attach cleanly.

**Tech Stack:** Python, FastAPI, Pydantic Settings, python-oracledb, pytest, FastAPI TestClient.

---

## File Structure

- Create `backend/pyproject.toml`: backend package metadata and dependencies.
- Create `backend/app/main.py`: FastAPI app factory and router registration.
- Create `backend/app/core/config.py`: environment-backed settings object.
- Create `backend/app/core/security.py`: legacy role mapping and current-user dependency placeholder.
- Create `backend/app/api/health.py`: `/api/health` endpoint.
- Create `backend/app/api/auth.py`: `/api/auth/me` endpoint returning 401 until sessions are implemented.
- Create `backend/app/schemas/auth.py`: authenticated user DTO.
- Create `backend/tests/test_health.py`: API health endpoint test.
- Create `backend/tests/test_security.py`: legacy role mapping tests.
- Create `backend/tests/test_auth.py`: unauthenticated `/api/auth/me` behavior test.
- Create `backend/README.md`: local setup and run commands.

## Task 1: Backend Package Skeleton

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/tests/__init__.py`

- [ ] **Step 1: Create package and dependency metadata**

```toml
[project]
name = "callab-backend"
version = "0.1.0"
description = "FastAPI backend for CALLAB RENEWAL"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "pydantic-settings>=2.4.0",
    "oracledb>=2.4.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "httpx>=0.27.0",
    "ruff>=0.6.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]

[tool.ruff]
line-length = 100
target-version = "py311"
```

- [ ] **Step 2: Create empty package marker files**

```python
"""CALLAB backend package."""
```

Use the same empty module docstring style for each `__init__.py`.

## Task 2: Write Failing Foundation Tests

**Files:**
- Create: `backend/tests/test_health.py`
- Create: `backend/tests/test_security.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Write health endpoint test**

```python
from fastapi.testclient import TestClient

from app.main import create_app


def test_health_endpoint_returns_service_status():
    client = TestClient(create_app())

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "callab-backend"}
```

- [ ] **Step 2: Write role mapping tests**

```python
from app.core.security import map_legacy_role


def test_master_role_maps_from_hct_admin_account():
    assert map_legacy_role(authority="A", corp_type="H") == "MASTER"


def test_employee_role_maps_from_hct_user_account():
    assert map_legacy_role(authority="U", corp_type="H") == "EMPLOYEE"


def test_customer_role_is_default_for_non_hct_accounts():
    assert map_legacy_role(authority="A", corp_type="C") == "USER"
```

- [ ] **Step 3: Write unauthenticated current-user test**

```python
from fastapi.testclient import TestClient

from app.main import create_app


def test_auth_me_requires_session():
    client = TestClient(create_app())

    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}
```

- [ ] **Step 4: Run tests and verify they fail before implementation**

Run:

```bash
cd backend
python -m pytest -q
```

Expected: import failures for missing `app.main` or missing implementation modules.

## Task 3: Implement Minimal FastAPI App

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/api/health.py`
- Create: `backend/app/api/auth.py`
- Create: `backend/app/core/security.py`
- Create: `backend/app/schemas/auth.py`

- [ ] **Step 1: Implement user schema**

```python
from pydantic import BaseModel


class CurrentUser(BaseModel):
    user_id: str
    name: str
    corp_id: str
    corp_name: str
    role: str
```

- [ ] **Step 2: Implement security helpers**

```python
from fastapi import HTTPException, status


def map_legacy_role(authority: str | None, corp_type: str | None) -> str:
    normalized_authority = (authority or "").strip().upper()
    normalized_corp_type = (corp_type or "").strip().upper()

    if normalized_corp_type == "H" and normalized_authority == "A":
        return "MASTER"
    if normalized_corp_type == "H" and normalized_authority == "U":
        return "EMPLOYEE"
    return "USER"


def require_current_user():
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )
```

- [ ] **Step 3: Implement health router**

```python
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health_check():
    return {"status": "ok", "service": "callab-backend"}
```

- [ ] **Step 4: Implement auth router**

```python
from fastapi import APIRouter, Depends

from app.core.security import require_current_user
from app.schemas.auth import CurrentUser

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me", response_model=CurrentUser)
def read_current_user(current_user: CurrentUser = Depends(require_current_user)):
    return current_user
```

- [ ] **Step 5: Implement app factory**

```python
from fastapi import FastAPI

from app.api import auth, health


def create_app() -> FastAPI:
    app = FastAPI(title="CALLAB Backend", version="0.1.0")
    app.include_router(health.router)
    app.include_router(auth.router)
    return app


app = create_app()
```

- [ ] **Step 6: Run tests and verify they pass**

Run:

```bash
cd backend
python -m pytest -q
```

Expected: all tests pass.

## Task 4: Add Runtime Configuration Boundary

**Files:**
- Create: `backend/app/core/config.py`
- Create: `backend/tests/test_config.py`

- [ ] **Step 1: Write settings test**

```python
from app.core.config import Settings


def test_settings_use_safe_defaults_for_local_development():
    settings = Settings()

    assert settings.app_name == "CALLAB Backend"
    assert settings.api_prefix == "/api"
    assert settings.oracle_thick_mode is True
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
cd backend
python -m pytest tests/test_config.py -q
```

Expected: FAIL because `app.core.config` does not exist.

- [ ] **Step 3: Implement settings**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CALLAB Backend"
    api_prefix: str = "/api"
    oracle_user: str = ""
    oracle_password: str = ""
    oracle_dsn: str = ""
    oracle_lib_dir: str = ""
    oracle_thick_mode: bool = True
    ftp_host: str = ""
    ftp_user: str = ""
    ftp_password: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="CALLAB_",
        extra="ignore",
    )
```

- [ ] **Step 4: Run tests and verify they pass**

Run:

```bash
cd backend
python -m pytest -q
```

Expected: all tests pass.

## Task 5: Document Local Backend Usage

**Files:**
- Create: `backend/README.md`

- [ ] **Step 1: Add setup instructions**

```markdown
# CALLAB FastAPI Backend

This service owns backend API responsibilities for CALLAB RENEWAL.

## Local Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
python -m pytest -q
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Production Shape

Apache should proxy `/api/*` to this service. The Next.js frontend should not connect directly to Oracle or FTP.

## Environment

Variables use the `CALLAB_` prefix:

```env
CALLAB_ORACLE_USER=
CALLAB_ORACLE_PASSWORD=
CALLAB_ORACLE_DSN=
CALLAB_ORACLE_LIB_DIR=
CALLAB_FTP_HOST=
CALLAB_FTP_USER=
CALLAB_FTP_PASSWORD=
```
```

- [ ] **Step 2: Run final verification**

Run:

```bash
cd backend
python -m pytest -q
```

Expected: all tests pass.
