@echo off
setlocal EnableExtensions

cd /d "%~dp0"

if not exist logs mkdir logs
where node >nul 2>nul
if errorlevel 1 (
  echo [Twillight] ERROR: Node.js was not found on PATH.
  exit /b 1
)

node script\run-node.mjs %*
exit /b %ERRORLEVEL%
