@echo off
rem ============================================================
rem  Design Library — rebuild + serve at http://localhost:8123
rem ============================================================
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 (
  echo Rebuilding library...
  node build.js
  echo.
)

echo Starting local server at http://localhost:8123 ...
start "" "http://localhost:8123"

where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8123 --bind 127.0.0.1
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8123 --bind 127.0.0.1
  goto :eof
)

echo.
echo  Python was not found, so no local server was started.
echo  The site also works without a server: just double-click index.html
pause
