@echo off
cd /d "%~dp0"

set http_proxy=http://127.0.0.1:7890
set https_proxy=http://127.0.0.1:7890

echo Current directory: %cd%
echo Proxy set to 127.0.0.1:7890
echo Starting gemini...

gemini

pause