@echo off
setlocal EnableExtensions

title OmniAntigravity Lite Launcher

set "ANTIGRAVITY_EXE=D:\PROGRAM FILES\Antigravity IDE\Antigravity IDE.exe"
set "OMNI_DIR=%~dp0"
set "CDP_PORT=7800"

echo.
echo ================================================
echo        OmniAntigravity Lite Launcher
echo ================================================
echo.

if not exist "%ANTIGRAVITY_EXE%" (
    echo ERROR: Antigravity executable not found:
    echo %ANTIGRAVITY_EXE%
    echo.
    pause
    exit /b 1
)

if not exist "%OMNI_DIR%package.json" (
    echo ERROR: OmniAntigravityLite installation not found:
    echo %OMNI_DIR%
    echo.
    pause
    exit /b 1
)

echo [1/3] Checking for existing Antigravity...
tasklist /FI "IMAGENAME eq Antigravity IDE.exe" 2>NUL | find /I "Antigravity IDE.exe" >NUL

if errorlevel 1 (
    echo       Starting Antigravity with CDP port %CDP_PORT%...
    start "" "%ANTIGRAVITY_EXE%" --remote-debugging-port=%CDP_PORT%
) else (
    echo       Antigravity is already running.
    
    :: Check if 7800 is actually open
    powershell -NoProfile -ExecutionPolicy Bypass -Command "if((Test-NetConnection 127.0.0.1 -Port %CDP_PORT% -WarningAction SilentlyContinue).TcpTestSucceeded){exit 0}else{exit 1}"
    if errorlevel 1 (
        echo.
        echo ERROR: Antigravity IDE is already running without CDP on port 7800.
        echo Please close Antigravity completely and run start.bat again.
        echo.
        pause
        exit /b 1
    )
)

echo.
echo [2/3] Waiting for CDP port %CDP_PORT%...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; for($i=0;$i -lt 30;$i++){try{$c=Test-NetConnection 127.0.0.1 -Port %CDP_PORT% -WarningAction SilentlyContinue; if($c.TcpTestSucceeded){$ok=$true;break}}catch{}; Start-Sleep -Seconds 1}; if(-not $ok){exit 1}"

if errorlevel 1 (
    echo ERROR: Antigravity CDP did not become available on port %CDP_PORT%.
    echo.
    pause
    exit /b 1
)

echo       CDP is ready.
echo.
echo [3/3] Starting OmniAntigravityLite...
echo.

:: Explicitly change directory without quote-escaping issues
cd /d "%~dp0"

:: Start the server explicitly
echo Project:
echo %~dp0
echo.
echo Working directory:
cd
echo.
echo Server target:
echo %~dp0src\server.js
echo.

node src\server.js

echo.
echo OmniAntigravityLite has stopped.
pause