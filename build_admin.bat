@echo off
echo ========================================
echo   Building Admin Panel EXE
echo ========================================
echo.

echo Step 1: Installing PyInstaller...
pip install pyinstaller
if errorlevel 1 (
    echo ERROR: Failed to install PyInstaller.
    pause
    exit /b 1
)

echo.
echo Step 2: Building Executable...
echo This may take a minute...

REM Clean previous builds
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist "Books Admin Panel.spec" del "Books Admin Panel.spec"

REM Build command
REM --noconsole: Don't show terminal window
REM --onefile: Bundle everything into a single .exe
REM --add-data: Include the serviceAccountKey.json
REM --collect-all: Ensure customtkinter assets are included
REM --paths: Add admin folder to python path to ensure imports work

pyinstaller --noconsole --onefile --name "Books Admin Panel" ^
    --add-data "serviceAccountKey.json;." ^
    --collect-all customtkinter ^
    --paths admin ^
    admin/main.py

if errorlevel 1 (
    echo ERROR: Build failed.
    pause
    exit /b 1
)

echo.
echo Step 3: Moving to Desktop...
move "dist\Books Admin Panel.exe" "%USERPROFILE%\Desktop\Books Admin Panel.exe"
if errorlevel 1 (
    echo ERROR: Failed to move EXE to Desktop.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD COMPLETE!
echo ========================================
echo.
echo The "Books Admin Panel.exe" is now on your Desktop.
echo You can run it from there anytime.
echo.
pause
