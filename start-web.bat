@echo off
chcp 65001 >nul
echo ========================================
echo   InkMon Pokedex - 本地开发服务器
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 构建 @inkmon/core...
call pnpm build:core
if errorlevel 1 (
    echo [ERROR] @inkmon/core 构建失败
    pause
    exit /b 1
)

echo.
echo [2/2] 启动 Web 开发服务器...
echo.
echo 访问地址: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo.

call pnpm dev:web
