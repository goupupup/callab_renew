# Architecture

## Current Architecture

```text
Browser
  -> Next.js frontend
  -> /api/* HTTP calls
  -> FastAPI backend
  -> Oracle DB / FTP
```

In local development, the frontend uses `NEXT_PUBLIC_API_BASE_URL` to call FastAPI on `127.0.0.1:8000`. In production, Apache should keep the frontend and API on the same origin and proxy `/api/*` to FastAPI.

## Frontend

`src/` contains only UI, client-side session state, and API client wrappers.

Frontend responsibilities:

- Render login, dashboard, equipment, search, schedule, and account screens.
- Store no Oracle or FTP credentials.
- Call FastAPI through `src/lib/api-client.ts`.
- Use `src/lib/auth-client.tsx` for FastAPI session-cookie authentication.
- Do not expose database schema names, table names, or backend implementation identifiers in UI text. Use product/domain wording instead.

## Backend

`backend/` owns all server-side integration.

Backend responsibilities:

- Authenticate against the legacy Oracle user table.
- Enforce role and customer access rules.
- Query and update Oracle through repository classes.
- Stream exports and FTP files through API endpoints.
- Keep Oracle/FTP details out of frontend code.

## Important Paths

```text
backend/app/api/              FastAPI routers
backend/app/repositories/     Oracle SQL boundary
backend/app/services/         Business logic and DTO mapping
backend/tests/                Backend test suite
src/app/                      Next.js routes and screens
src/lib/api-client.ts         Browser-safe API client
src/lib/auth-client.tsx       Browser-side auth context
```

## Production Shape

```text
Apache
  /api/* -> FastAPI backend on 127.0.0.1:8000
  /*     -> Next.js frontend on 127.0.0.1:3000
```

Oracle access should use python-oracledb Thick mode for the current legacy database compatibility.
