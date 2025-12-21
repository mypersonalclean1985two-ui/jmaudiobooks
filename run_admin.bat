@echo off
echo ========================================
echo   Starting Books App Admin Panel
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in your PATH.
    echo Please install Python from python.org
    pause
    exit /b 1
)

echo Step 1: Installing dependencies...
pip install -r admin/requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo Step 2: Launching Admin Panel...
cd admin
python main.py
if errorlevel 1 (
    echo ERROR: Admin Panel crashed or closed with an error.
    pause
    exit /b 1
)

echo.
echo Admin Panel closed.
pause
