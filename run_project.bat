@echo off
echo Starting Dayflow HRMS Backend and Frontend...

:: Start Backend in a new command window
echo Launching Backend (FastAPI)...
start cmd /k "cd backend && .venv\Scripts\activate && uvicorn app.main:app --host 127.0.0.1 --port 8000"

:: Start Frontend in a new command window
echo Launching Frontend (Vite)...
start cmd /k "cd frontend && npm run dev"

echo Dayflow HRMS has been launched!
echo Backend is running at: http://127.0.0.1:8000/docs
echo Frontend is running at: http://localhost:5173
pause
