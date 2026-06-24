# CALLAB FastAPI Backend

This service owns backend API responsibilities for CALLAB RENEWAL.

The Next.js frontend should not connect directly to Oracle or FTP. Apache should route `/api/*` to this backend service.

## Local Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
python -m pytest -q
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

This repository currently targets Python 3.11+ for the backend. The first tests are written with Python 3.9-compatible syntax so the existing local macOS Python can still verify the foundation.

## Production Shape

```text
Apache
  /api/* -> FastAPI backend on 127.0.0.1:8000
  /*     -> Next.js frontend
```

Recommended process command:

```bash
gunicorn app.main:app \
  -k uvicorn.workers.UvicornWorker \
  --bind 127.0.0.1:8000 \
  --workers 2
```

## Environment

Variables use the `CALLAB_` prefix:

```env
CALLAB_ORACLE_USER=
CALLAB_ORACLE_PASSWORD=
CALLAB_ORACLE_DSN=
CALLAB_ORACLE_LIB_DIR=
CALLAB_ORACLE_THICK_MODE=true
CALLAB_FTP_HOST=
CALLAB_FTP_USER=
CALLAB_FTP_PASSWORD=
```

For compatibility with the existing Next.js environment, the backend also reads these legacy Oracle variable names when `CALLAB_` values are absent:

```env
ORACLE_USER=
ORACLE_PASS=
ORACLE_CONN_STR=
ORACLE_LIB_DIR=
```

Use Oracle Thick mode in production unless Oracle compatibility testing proves Thin mode is sufficient.

## Implemented API Slice

```text
GET  /api/health
POST /api/auth/login
GET  /api/auth/me
GET  /api/dashboard/stats
GET  /api/dashboard/expirations
GET  /api/equipment
GET  /api/equipment/export
GET  /api/search/lookups
```
