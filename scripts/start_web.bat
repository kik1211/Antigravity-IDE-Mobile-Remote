@echo off
setlocal enabledelayedexpansion
title Antigravity Phone Connect - WEB MODE

:: Navigate to script directory
cd /d "%~dp0"

echo ===================================================
echo   Antigravity Phone Connect - WEB ACCESS MODE
echo ===================================================
echo.

:: 0. Aggressive Cleanup (Clear any stuck processes from previous runs)
echo [0/2] Cleaning up orphans...
taskkill /f /im node.exe /fi "WINDOWTITLE eq AG_SERVER_PROC*" >nul 2>&1
taskkill /f /im ngrok.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

:: 1. Ensure dependencies are installed
if not exist "node_modules" (
    echo [INFO] Installing Node.js dependencies...
    call npm install
)

:: 2. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js missing.
    pause
    exit /b
)

:: 3. Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python missing. Required for the web tunnel.
    pause
    exit /b
)

:: 4. Check for .env file
if exist ".env" goto ENV_FOUND
if exist "%~dp0.env" goto ENV_FOUND

echo [WARNING] .env file not found. This is required for Web Access.
echo.

if exist ".env.example" (
    echo [INFO] Creating .env from .env.example...
    copy .env.example .env >nul
    echo [SUCCESS] .env created from template!
    echo [ACTION] Please open .env and update it with your configuration (e.g., NGROK_AUTHTOKEN).
    pause
    exit /b
) else (
    echo [ERROR] .env.example not found. Cannot create .env template.
    pause
    exit /b
)

:ENV_FOUND
echo [INFO] .env configuration found.

:: 5. Ensure Antigravity is running
set "ANTIGRAVITY_EXE=D:\PROGRAM FILES\Antigravity IDE\Antigravity IDE.exe"
set "CDP_PORT=7800"

echo [1/2] Checking for existing Antigravity...
tasklist /FI "IMAGENAME eq Antigravity IDE.exe" 2>NUL | find /I "Antigravity IDE.exe" >NUL
if errorlevel 1 (
    echo       Starting Antigravity with CDP port %CDP_PORT%...
    start "" "%ANTIGRAVITY_EXE%" --remote-debugging-port=%CDP_PORT%
) else (
    echo       Antigravity is already running.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "if((Test-NetConnection 127.0.0.1 -Port %CDP_PORT% -WarningAction SilentlyContinue).TcpTestSucceeded){exit 0}else{exit 1}"
    if errorlevel 1 (
        echo ERROR: Antigravity IDE is already running without CDP on port 7800.
        echo Please close Antigravity completely and run start_web.bat again.
        pause
        exit /b 1
    )
)

echo [2/2] Waiting for CDP port %CDP_PORT%...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; for($i=0;$i -lt 30;$i++){try{$c=Test-NetConnection 127.0.0.1 -Port %CDP_PORT% -WarningAction SilentlyContinue; if($c.TcpTestSucceeded){$ok=$true;break}}catch{}; Start-Sleep -Seconds 1}; if(-not $ok){exit 1}"
if errorlevel 1 (
    echo ERROR: Antigravity CDP did not become available on port %CDP_PORT%.
    pause
    exit /b 1
)

:: 6. Launch everything via Node.js
echo [1/1] Launching Antigravity Phone Connect...
echo (This will start both the server and the web tunnel)
@echo off
cd /d "%~dp0\.."
node launcher.js --mode web
if %errorlevel% neq 0 pause
exit
