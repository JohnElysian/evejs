@echo off
setlocal EnableExtensions EnableDelayedExpansion
title EvEJS One-Click Setup

for %%I in ("%~dp0.") do set "EVEJS_REPO_ROOT=%%~fI"
set "EVEJS_NEWDB_DATA_DIR=%EVEJS_REPO_ROOT%\_local\newDatabase\data"

echo.
echo   ============================================================
echo     EvEJS One-Click Setup
echo   ============================================================
echo.
echo   This installs Node dependencies, opens ClientSETUP so you can
echo   select and patch your own copied EVE client, then generates
echo   the local database.
echo.

call :EnsureNode
if errorlevel 1 exit /b 1

pushd "%EVEJS_REPO_ROOT%"

echo.
echo   Installing root npm dependencies...
call npm ci
if errorlevel 1 (
  echo.
  echo   [ERROR] Root npm ci failed.
  popd
  pause
  exit /b 1
)

echo.
echo   Installing server npm dependencies...
call npm --prefix server ci
if errorlevel 1 (
  echo.
  echo   [ERROR] Server npm ci failed.
  popd
  pause
  exit /b 1
)

echo.
echo   Preparing local TLS certificates...
call powershell -NoProfile -ExecutionPolicy Bypass -File "%EVEJS_REPO_ROOT%\tools\ClientSETUP\scripts\Install-EvEJSCerts.ps1" -SkipRootStore -SkipClientBundles
if errorlevel 1 (
  echo.
  echo   [ERROR] Local certificate creation failed.
  popd
  pause
  exit /b 1
)

echo.
echo   Opening ClientSETUP. Select your copied EVE client and complete
echo   the certificate, blue.dll patch, and start.ini steps.
call "%EVEJS_REPO_ROOT%\tools\ClientSETUP\StartClientSetup.bat"
if errorlevel 1 (
  echo.
  echo   [ERROR] ClientSETUP reported a failure.
  popd
  pause
  exit /b 1
)

echo.
echo   Creating local generated database...
call "%EVEJS_REPO_ROOT%\DatabaseCreator.bat"
if errorlevel 1 (
  echo.
  echo   [ERROR] Database creation failed.
  popd
  pause
  exit /b 1
)

popd

echo.
echo   ============================================================
echo     Setup complete
echo   ============================================================
echo.
echo   Next:
echo     1. Run StartServer.bat
echo     2. Choose option 2 for Server + Play
echo.
pause
exit /b 0

:EnsureNode
where node >nul 2>&1
if not errorlevel 1 exit /b 0

echo   Node.js LTS was not found on PATH.
where winget >nul 2>&1
if errorlevel 1 (
  echo.
  echo   [ERROR] winget is not available, so setup cannot install Node.js.
  echo       Install Node.js LTS from https://nodejs.org and run this again.
  pause
  exit /b 1
)

echo   Installing Node.js LTS with winget...
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
if errorlevel 1 (
  echo.
  echo   [ERROR] winget could not install Node.js LTS.
  echo       Install Node.js LTS from https://nodejs.org and run this again.
  pause
  exit /b 1
)

set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo   [ERROR] Node.js installed, but node.exe is not on PATH yet.
  echo       Open a new terminal and run SetupEveJS.bat again.
  pause
  exit /b 1
)
exit /b 0
