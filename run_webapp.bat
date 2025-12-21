@echo off
echo ========================================
echo   Starting Books Web App (Local)
echo ========================================
echo.
echo Attempting to start server on port 8080...
echo.

cd webapp

REM Start Chrome browser in a separate process
start chrome http://localhost:8080

REM Start the Python HTTP server
python -m http.server 8080

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start the server.
    echo Port 8080 might be in use or Python is not working correctly.
    echo.
)

pause
