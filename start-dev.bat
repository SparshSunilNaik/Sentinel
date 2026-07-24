@echo off
echo Starting Sentinel backend on :8000 ...
start "Sentinel API" cmd /k "cd /d %~dp0backend && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
timeout /t 2 >nul
echo Starting Sentinel frontend on :3000 ...
start "Sentinel UI" cmd /k "cd /d %~dp0frontend && npm run dev"
echo.
echo Dashboard: http://localhost:3000
echo API docs:  http://localhost:8000/docs
echo Login:     operator@amex.com / sentinel2026
