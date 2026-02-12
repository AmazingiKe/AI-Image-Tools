@echo off
:: Set character set to UTF-8
chcp 65001 > nul

title AI-Image-Tools Launcher
echo ==========================================
echo Starting AI-Image-Tools...
echo ==========================================

:: Start Server
echo [1/2] Starting Server (Rust Axum) in new window...
start "AI-Server" cmd /c "cd server && cargo run"

:: Wait for server to initialize
timeout /t 5 /nobreak > nul

:: Start Client
echo [2/2] Starting Client (Vite React) in new window...
start "AI-Client" cmd /c "cd client && npm run dev"

echo ==========================================
echo All services started!
echo - Backend: http://localhost:3000
echo - Frontend: http://localhost:5173
echo ==========================================
pause
