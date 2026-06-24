# Directive: Frontend / Backend Split

## Goal

Refactor CALLAB RENEWAL from a Next.js full-stack application into a separated frontend and backend architecture.

The current Next.js API Routes connect directly to Oracle and FTP. That should be replaced with a dedicated Python FastAPI backend service. The backend framework does not need to match the existing legacy Callab Spring Boot application, but it must fit Oracle 11g, legacy SQL, Apache reverse proxy deployment, audit logging, and file streaming requirements.

## Target Architecture

```text
External / internal users
  -> Company domain / public company IP
  -> Apache HTTPD
  -> Frontend: Next.js static or Node-rendered app
  -> Backend API under /api
  -> Oracle DB, FTP, legacy systems
```

Recommended routing:

```text
https://callab.company.com/        -> Next.js frontend
https://callab.company.com/api/*   -> Backend API
```

The frontend must never connect directly to Oracle, FTP, or other internal services.

## Responsibility Split

### Frontend: Next.js

- Render login, dashboard, equipment, search, schedule, and account screens.
- Call backend REST APIs through a typed API client.
- Hold no Oracle credentials, FTP credentials, or DB-specific SQL.
- Perform client-side UI validation only. Server-side validation remains authoritative.
- Keep UI route protection, but do not rely on UI checks for authorization.

### Backend API

- Own authentication, sessions or JWT issuance, and role resolution.
- Own all Oracle access through repositories/services.
- Own FTP file lookup, upload, download streaming, and file validation.
- Enforce tenant scoping by `corpId`.
- Enforce RBAC for `MASTER`, `EMPLOYEE`, and customer users.
- Write audit logs for all mutations and sensitive exports/downloads.
- Return stable DTOs independent of Oracle table shapes.

Recommended stack:

```text
Python 3.12+
FastAPI for REST API
Pydantic v2 for request/response schemas
python-oracledb in Thick mode for Oracle access
python-oracledb connection pool
Uvicorn/Gunicorn for production serving
pytest for tests
```

Why this is preferred:

- FastAPI keeps the backend API small and explicit.
- Pydantic gives typed DTOs and OpenAPI documentation.
- `python-oracledb` supports Oracle access and connection pooling without forcing an ORM model.
- Direct SQL repositories fit the current Oracle schema and existing handcrafted queries.
- Thick mode keeps compatibility with the current legacy Oracle environment.

Avoid for this project unless there is a specific reason:

- Prisma or Drizzle: Oracle support is not a good fit for this existing Oracle database.
- ORM-first design: risky with legacy tables, CHAR padding, Oracle-specific functions, and hand-tuned search SQL.
- Django-first design: useful for admin-heavy greenfield apps, but too much framework surface for this API migration.
- Browser/Next.js direct Oracle access: not allowed in target architecture.

### Apache / Tomcat

- Terminate TLS.
- Route `/api/*` to the backend API.
- Route all other paths to the frontend.
- Apply request size limits, timeout policy, and security headers.

## Backend API Groups

Initial API boundary should mirror current Next.js API Routes:

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/dashboard/stats
GET    /api/dashboard/expirations

GET    /api/equipment
GET    /api/equipment/export
GET    /api/equipment/{hctNo}/download
POST   /api/equipment/{hctNo}/upload

GET    /api/search/lookups
GET    /api/search/reg-no
GET    /api/search/cal-no
GET    /api/search/model
GET    /api/search/ongoing
GET    /api/search/expirations
PUT    /api/equipment/{hctNo}

GET    /api/schedules
POST   /api/schedules
PUT    /api/schedules/{scheduleId}
DELETE /api/schedules/{scheduleId}

GET    /api/accounts
POST   /api/accounts
```

## Migration Rules

1. Create backend DTOs before moving SQL.
2. Move one API group at a time.
3. Keep frontend screens stable while swapping the data source.
4. Delete the corresponding Next.js API Route after the backend endpoint is verified.
5. Never expose Oracle table names, raw SQL errors, or FTP paths to the browser.
6. Add audit logging before enabling mutation endpoints in production.

## Security Requirements

- The backend database account should use least privilege.
- Prefer separate DB users for read-only and mutation operations.
- All mutations require server-side RBAC checks.
- All customer-facing queries must enforce `corpId` tenant filtering on the backend.
- Login must use generic failure responses.
- Password migration from legacy plaintext comparison to hashed credentials should be planned.
- Uploads require file size, extension, MIME, and content-signature validation.
- Download and export actions should be audit logged.
- Production logs must mask credentials, session tokens, SQL parameters containing personal data, and FTP paths where appropriate.

## Frontend Refactor Rules

- Replace direct calls to `/api/*` Next.js routes with a shared client in `src/lib/api-client.ts`.
- Use `NEXT_PUBLIC_API_BASE_URL` only for browser-safe API base URL configuration.
- Do not use `ORACLE_*` or `FTP_*` environment variables in the frontend project after migration.
- Keep frontend models typed separately from backend DTOs only when UI state needs extra fields.

## Deployment Model

Recommended production layout:

```text
/var/www/callab-frontend    Next.js build output or Node app
/opt/callab-backend         FastAPI backend service
/etc/httpd/conf.d/callab.conf
```

Apache example routing:

```apache
ProxyPass        /api http://127.0.0.1:8080/api
ProxyPassReverse /api http://127.0.0.1:8080/api

ProxyPass        / http://127.0.0.1:3000/
ProxyPassReverse / http://127.0.0.1:3000/
```

If the frontend is exported as static files, Apache can serve it directly and only proxy `/api` to the backend API.

## Migration Order

1. Define API contract and DTOs.
2. Implement backend auth and `/api/auth/me`.
3. Move read-only dashboard and equipment list endpoints.
4. Move advanced search endpoints.
5. Move FTP download/export endpoints.
6. Move upload and mutation endpoints with audit logging.
7. Remove Oracle/FTP dependencies from Next.js.
8. Harden Apache/Tomcat production config.
9. Run pilot with read-only users first, then enable mutation flows.
