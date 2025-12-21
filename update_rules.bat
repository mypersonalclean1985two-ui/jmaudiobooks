@echo off
echo ========================================
echo   Updating Firebase Rules
echo ========================================
echo.

echo Step 1: Checking for Firebase CLI...
call firebase --version >nul 2>&1
if errorlevel 1 (
    echo Firebase CLI not found. Installing...
    call npm install -g firebase-tools
    if errorlevel 1 (
        echo ERROR: Could not install Firebase CLI. Please install Node.js.
        pause
        exit /b 1
    )
)

echo.
echo Step 2: Deploying Rules...
call firebase deploy --only firestore:rules
if errorlevel 1 (
    echo ERROR: Failed to deploy rules. Make sure you are logged in (run 'firebase login').
    pause
    exit /b 1
)

echo.
echo Rules updated successfully!
echo.
pause
