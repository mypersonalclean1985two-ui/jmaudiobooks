@echo off
echo ========================================
echo   Shadow Library - Firebase Deployment
echo ========================================
echo.
echo Project: book-258ee
echo.

echo Step 1: Installing Firebase CLI...
call npm install -g firebase-tools
if errorlevel 1 (
    echo ERROR: Failed to install Firebase CLI
    pause
    exit /b 1
)

echo.
echo Step 2: Logging in to Firebase...
call firebase login
if errorlevel 1 (
    echo ERROR: Firebase login failed
    pause
    exit /b 1
)

echo.
echo Step 3: Initializing Firebase Hosting...
echo.
echo IMPORTANT: When prompted:
echo - Public directory: webapp
echo - Single-page app: y
echo - Overwrite index.html: n
echo.
pause
call firebase init hosting
if errorlevel 1 (
    echo ERROR: Firebase init failed
    pause
    exit /b 1
)

echo.
echo Step 4: Deploying to Firebase...
call firebase deploy --only hosting
if errorlevel 1 (
    echo ERROR: Deployment failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your app is live at:
echo https://book-258ee.web.app
echo.
echo Share it with the world! 🎉
echo.
pause
