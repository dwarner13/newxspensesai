@echo off
echo ============================================================
echo   Starting Netlify Dev Server
echo ============================================================
echo.

cd /d "%~dp0"

echo Checking dependencies...
call pnpm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: pnpm not found. Please install pnpm first.
    pause
    exit /b 1
)

echo Installing/updating netlify-cli...
call pnpm add -D netlify-cli@latest

echo.
echo ============================================================
echo   Starting server on http://localhost:8888
echo ============================================================
echo.
echo The server will start below. Keep this window open!
echo.
echo Once you see "Server now ready", open:
echo   http://localhost:8888
echo.
echo Press Ctrl+C to stop the server.
echo.

call pnpm dev

pause



















