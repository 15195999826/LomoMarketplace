@echo off
REM Browser Control Server Startup Script
REM This script starts the Bridge Server that connects browser extension to Claude Code

echo ========================================
echo  Browser Control Server
echo ========================================
echo.

cd /d "%~dp0.."

echo Starting Bridge Server on port 9222...
echo.
echo Once started:
echo   1. Open Chrome and enable the browser-ext extension
echo   2. Click the extension icon to open the side panel
echo   3. The terminal will connect to Claude Code automatically
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

pnpm --filter @lomo/browser-control-server start
