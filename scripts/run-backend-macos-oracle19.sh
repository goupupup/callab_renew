#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export CALLAB_ORACLE_LIB_DIR="${CALLAB_ORACLE_LIB_DIR:-$ROOT_DIR/.oracle/instantclient_19_20}"
export CALLAB_ORACLE_THICK_MODE="${CALLAB_ORACLE_THICK_MODE:-true}"

if [[ -z "${CALLAB_ORACLE_USER:-}" || -z "${CALLAB_ORACLE_PASSWORD:-}" ]]; then
  echo "Set CALLAB_ORACLE_USER and CALLAB_ORACLE_PASSWORD before running this script." >&2
  exit 1
fi

exec arch -x86_64 "$ROOT_DIR/backend/.venv-x64/bin/python" \
  -m uvicorn app.main:app \
  --app-dir backend \
  --host 127.0.0.1 \
  --port 8000
