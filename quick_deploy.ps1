# Quick Deploy Script
# Run this after installing Node.js

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Books App - Firebase Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if firebase is installed
Write-Host "Checking Firebase CLI..." -ForegroundColor Yellow
$firebaseInstalled = Get-Command firebase -ErrorAction SilentlyContinue

if (-not $firebaseInstalled) {
    Write-Host "Installing Firebase CLI..." -ForegroundColor Yellow
    npm install -g firebase-tools
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install Firebase CLI" -ForegroundColor Red
        Write-Host "Please install Node.js first from: https://nodejs.org" -ForegroundColor Yellow
        pause
        exit 1
    }
}

Write-Host "✓ Firebase CLI ready" -ForegroundColor Green
Write-Host ""

# Login
Write-Host "Logging in to Firebase..." -ForegroundColor Yellow
firebase login
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Login failed" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "✓ Logged in" -ForegroundColor Green
Write-Host ""

# Deploy
Write-Host "Deploying to Firebase Hosting..." -ForegroundColor Yellow
firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your app is live at:" -ForegroundColor Cyan
    Write-Host "https://book-258ee.web.app" -ForegroundColor White
    Write-Host ""
    Write-Host "Test your subscription system now! 🎉" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "ERROR: Deployment failed" -ForegroundColor Red
    Write-Host "Check the error messages above" -ForegroundColor Yellow
}

Write-Host ""
pause
