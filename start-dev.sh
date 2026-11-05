#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

if [[ -x "$BACKEND_DIR/.venv/bin/python" ]]; then
  PYTHON="$BACKEND_DIR/.venv/bin/python"
elif [[ -x "$BACKEND_DIR/.venv/Scripts/python.exe" ]]; then
  PYTHON="$BACKEND_DIR/.venv/Scripts/python.exe"
else
  echo "Backend virtual environment not found. Create it with:" >&2
  echo "  python -m venv backend/.venv" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found on PATH." >&2
  exit 1
fi

cleanup() {
  trap - TERM INT EXIT
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}

echo "Starting Sentinel backend on :8000 ..."
(
  cd "$BACKEND_DIR"
  exec "$PYTHON" -m uvicorn app.main:app --reload --port 8000
) &
BACKEND_PID=$!

echo "Starting Sentinel frontend on :3000 ..."
(
  cd "$FRONTEND_DIR"
  exec npm run dev
) &
FRONTEND_PID=$!

trap cleanup TERM INT EXIT

echo
echo "Dashboard: http://localhost:3000"
echo "API docs:  http://localhost:8000/docs"
echo "Login:     operator@amex.com / sentinel2026"
echo
echo "Press Ctrl+C to stop both services."

wait -n "$BACKEND_PID" "$FRONTEND_PID"