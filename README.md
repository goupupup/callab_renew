# CALLAB RENEWAL

CALLAB RENEWAL은 기존 교정 관리 시스템을 Next.js 프론트엔드와 Python FastAPI 백엔드로 분리한 리뉴얼 프로젝트입니다.

## Stack

- Frontend: Next.js App Router, React, Tailwind CSS
- Backend: Python FastAPI, Pydantic, python-oracledb Thick mode
- Database: Oracle legacy schema
- File storage: FTP, backend-only access
- Deployment: Apache reverse proxy in front of Next.js and FastAPI

## Structure

```text
src/                         Next.js frontend
backend/                     FastAPI backend
docs/deployment-intranet-plan.md
public/HCT_logo.png
```

The frontend must not connect directly to Oracle or FTP. Browser requests call `/api/*`, and Apache routes those requests to FastAPI in production.

## Local Development

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
npm install
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run dev -- --hostname 127.0.0.1 --port 3000
```

## Verification

```bash
backend/.venv/bin/python -m pytest -q
npx tsc --noEmit
```

## Deployment

See [docs/deployment-intranet-plan.md](./docs/deployment-intranet-plan.md).
