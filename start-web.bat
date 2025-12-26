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

REM 从 3000 开始查找可用端口
set PORT=3000
set MAX_PORT=3010

:find_port
netstat -an | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    goto :start_server
)
echo 端口 %PORT% 已被占用，尝试下一个...
set /a PORT+=1
if %PORT% gtr %MAX_PORT% (
    echo [ERROR] 端口 3000-%MAX_PORT% 全部被占用
    pause
    exit /b 1
)
goto :find_port

:start_server
echo.
echo 访问地址: http://localhost:%PORT%
echo 按 Ctrl+C 停止服务器
echo.

cd inkmon-pokedex
call npx next dev -p %PORT%
