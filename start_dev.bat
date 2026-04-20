@echo off
SETLOCAL
:: 確保每次啟動都吃到 D 槽的便攜版環境
SET PATH=D:\Nodejs;D:\Python;D:\Python\Scripts;%PATH%

echo [TaskFlow] Starting Backend API (Flask) on port 5000...
start "TaskFlow Backend" cmd /k "cd /d D:\Antigravity\taskflow\backend && D:\Python\python.exe app.py"

echo [TaskFlow] Starting Frontend (Vite) on port 5173...
start "TaskFlow Frontend" cmd /k "cd /d D:\Antigravity\taskflow\frontend && D:\Nodejs\npm.cmd run dev"

echo [TaskFlow] Both servers started in new windows!
echo [TaskFlow] Backend running on http://127.0.0.1:5000
echo [TaskFlow] Frontend running on http://localhost:5173
echo.
pause
