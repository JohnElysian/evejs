@echo off
setlocal EnableExtensions EnableDelayedExpansion
title EvEJS Database Creator

for %%I in ("%~dp0.") do set "EVEJS_REPO_ROOT=%%~fI"
set "EVEJS_NATIVE_CREATOR=%EVEJS_REPO_ROOT%\tools\DatabaseCreator\bin\DatabaseCreator.exe"
set "EVEJS_DATABASE_CREATOR_CLIENT_ARG="
set "EVEJS_DATABASE_CREATOR_HAS_CLIENT_DIR=0"

for %%A in (%*) do (
  if /I "%%~A"=="--client-dir" set "EVEJS_DATABASE_CREATOR_HAS_CLIENT_DIR=1"
)

if exist "%EVEJS_REPO_ROOT%\tools\ClientSETUP\scripts\EvEJSConfig.bat" (
  call "%EVEJS_REPO_ROOT%\tools\ClientSETUP\scripts\EvEJSConfig.bat" >nul 2>&1
)

if "%EVEJS_DATABASE_CREATOR_HAS_CLIENT_DIR%"=="0" if defined EVEJS_CLIENT_PATH set "EVEJS_DATABASE_CREATOR_CLIENT_ARG=%EVEJS_CLIENT_PATH%"
if "%EVEJS_DATABASE_CREATOR_HAS_CLIENT_DIR%"=="0" if not defined EVEJS_DATABASE_CREATOR_CLIENT_ARG if exist "%EVEJS_REPO_ROOT%\client\bin64\exefile.exe" set "EVEJS_DATABASE_CREATOR_CLIENT_ARG=%EVEJS_REPO_ROOT%\client"
if "%EVEJS_DATABASE_CREATOR_HAS_CLIENT_DIR%"=="0" if not defined EVEJS_DATABASE_CREATOR_CLIENT_ARG if exist "%EVEJS_REPO_ROOT%\client\tq\bin64\exefile.exe" set "EVEJS_DATABASE_CREATOR_CLIENT_ARG=%EVEJS_REPO_ROOT%\client\tq"
if "%EVEJS_DATABASE_CREATOR_HAS_CLIENT_DIR%"=="0" if not defined EVEJS_DATABASE_CREATOR_CLIENT_ARG if exist "%EVEJS_REPO_ROOT%\client\EVE\bin64\exefile.exe" set "EVEJS_DATABASE_CREATOR_CLIENT_ARG=%EVEJS_REPO_ROOT%\client\EVE"
if "%EVEJS_DATABASE_CREATOR_HAS_CLIENT_DIR%"=="0" if not defined EVEJS_DATABASE_CREATOR_CLIENT_ARG if exist "%EVEJS_REPO_ROOT%\client\EVE\tq\bin64\exefile.exe" set "EVEJS_DATABASE_CREATOR_CLIENT_ARG=%EVEJS_REPO_ROOT%\client\EVE\tq"

echo.
echo   ============================================================
echo     EvEJS Database Creator
echo   ============================================================
echo.

if not exist "%EVEJS_NATIVE_CREATOR%" (
  echo   [ERROR] DatabaseCreator.exe is missing:
  echo       %EVEJS_NATIVE_CREATOR%
  echo.
  echo   This build expects the single native creator binary to be present.
  exit /b 1
)

if defined EVEJS_DATABASE_CREATOR_CLIENT_ARG (
  "%EVEJS_NATIVE_CREATOR%" --repo-root "%EVEJS_REPO_ROOT%" --client-dir "%EVEJS_DATABASE_CREATOR_CLIENT_ARG%" %*
) else (
  "%EVEJS_NATIVE_CREATOR%" --repo-root "%EVEJS_REPO_ROOT%" %*
)
exit /b %errorlevel%
