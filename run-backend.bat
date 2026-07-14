@echo off
cd backend
echo Starting FastAPI Backend...
call .\venv\Scripts\uvicorn app.main:app --reload --port 8000
pause
