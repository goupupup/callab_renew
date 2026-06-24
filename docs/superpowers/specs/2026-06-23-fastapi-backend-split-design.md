# FastAPI Backend Split Design

## Context

CALLAB RENEWAL currently uses Next.js for both UI and backend API Routes. Those API Routes connect directly to Oracle and FTP through `oracledb` and `basic-ftp`.

The target direction is:

- Keep the frontend in Next.js.
- Move all backend responsibilities to Python FastAPI.
- Keep Oracle, FTP, authentication, authorization, and audit logging out of the frontend.
- Run behind the existing company domain and Apache reverse proxy setup.

## Architecture

```text
External / internal users
  -> Company domain / public company IP
  -> Apache HTTPD
  -> Next.js frontend
  -> FastAPI backend under /api
  -> Oracle DB / FTP / legacy systems
```

Apache routes:

```text
/api/* -> FastAPI backend
/*     -> Next.js frontend
```

The frontend calls relative `/api/*` endpoints in production. In local development, `NEXT_PUBLIC_API_BASE_URL` can point to `http://127.0.0.1:8000`.

## Backend Stack

Recommended stack:

```text
Python 3.12+
FastAPI
Pydantic v2
python-oracledb in Thick mode
Uvicorn / Gunicorn
pytest
ruff
```

Use direct SQL repositories, not ORM-first modeling. The existing Oracle schema is legacy-heavy and search queries need explicit control over `TRIM`, `TO_CHAR`, `ROWNUM`, and Oracle-specific behavior.

SQLAlchemy Core can be considered later for query composition, but the first migration should use `python-oracledb` directly to keep behavior close to the current Next.js SQL.

## Backend Project Layout

```text
backend/
  app/
    main.py
    core/
      config.py
      database.py
      security.py
      errors.py
    api/
      auth.py
      dashboard.py
      equipment.py
      search.py
      schedules.py
      accounts.py
    repositories/
      auth_repo.py
      dashboard_repo.py
      equipment_repo.py
      search_repo.py
      schedule_repo.py
      account_repo.py
    services/
      auth_service.py
      equipment_service.py
      ftp_service.py
      audit_service.py
    schemas/
      auth.py
      dashboard.py
      equipment.py
      search.py
      schedules.py
      accounts.py
      common.py
  tests/
```

## API Boundary

Initial backend routes mirror the current Next.js API Routes:

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/dashboard/stats
GET    /api/dashboard/expirations

GET    /api/equipment
GET    /api/equipment/export
GET    /api/equipment/{hct_no}/download
POST   /api/equipment/{hct_no}/upload
PUT    /api/equipment/{hct_no}

GET    /api/search/lookups
GET    /api/search/reg-no
GET    /api/search/cal-no
GET    /api/search/model
GET    /api/search/ongoing
GET    /api/search/expirations

GET    /api/schedules
POST   /api/schedules
PUT    /api/schedules/{schedule_id}
DELETE /api/schedules/{schedule_id}

GET    /api/accounts
POST   /api/accounts
```

## Authentication

Use server-issued HttpOnly cookies for browser sessions.

Flow:

```text
POST /api/auth/login
  -> query CUSTCAL.TWUSRMAN
  -> verify active STATE = '1'
  -> map AUTHORITY/CORPTYPE to role
  -> create signed session cookie

GET /api/auth/me
  -> read cookie
  -> return user id, name, corpId, corpName, role
```

For first migration, keep legacy password comparison compatible with `TWUSRMAN.PASSWORD`. Add login failure throttling and generic failure responses before production use.

## Authorization

Roles:

- `MASTER`: all companies, all admin functions.
- `EMPLOYEE`: internal user, broad equipment/search/file functions but no account administration unless explicitly granted.
- `USER`: customer user, restricted to own `corpId`.

All tenant filtering must happen in FastAPI services/repositories. UI route hiding is only presentation.

## Oracle Access

Use a process-wide `python-oracledb` connection pool initialized at application startup.

Rules:

- Thick mode is the production default because the current Oracle environment needs legacy compatibility.
- Keep read queries and mutation commands separate.
- Bind all parameters.
- Do not return raw Oracle errors to the browser.
- Normalize padded Oracle `CHAR` data at the repository boundary.
- Audit every mutation with before/after values where practical.

## FTP Access

FastAPI owns all FTP operations:

- File existence lookup.
- Download streaming.
- Upload validation.
- Remote path construction.

The frontend never receives raw FTP paths unless explicitly safe for debugging in non-production.

## Migration Strategy

1. Scaffold FastAPI backend with health, config, tests, and Oracle pool boundary.
2. Add frontend API client abstraction while existing Next.js API Routes still work.
3. Move auth endpoints first.
4. Move read-only dashboard and equipment list endpoints.
5. Move advanced search endpoints.
6. Move export/download endpoints.
7. Move upload and mutation endpoints with audit logging.
8. Remove `oracledb`, `basic-ftp`, and Next.js API Routes from the frontend.

## Testing

Testing layers:

- Unit tests for config, role mapping, parameter normalization, and service authorization.
- Repository tests with mocked Oracle cursor for SQL bind behavior.
- Integration tests against a test Oracle instance when available.
- API tests using FastAPI `TestClient`.

The first implementation should include tests for:

- Health endpoint.
- Settings loading.
- Role mapping from legacy auth fields.
- Unauthorized `/api/auth/me` behavior.

## Deployment

Recommended backend process:

```text
gunicorn app.main:app \
  -k uvicorn.workers.UvicornWorker \
  --bind 127.0.0.1:8000 \
  --workers 2
```

Apache reverse proxy:

```apache
ProxyPass        /api http://127.0.0.1:8000/api
ProxyPassReverse /api http://127.0.0.1:8000/api
```

The backend service must run on the same protected server network that can reach Oracle and FTP.

## Non-Goals For First Pass

- Rewriting every query immediately.
- Introducing a full ORM model for the legacy Oracle schema.
- Changing frontend page design.
- Changing legacy password storage format immediately.
- Changing Oracle schema.
