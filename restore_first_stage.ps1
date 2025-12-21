# Quick Restore Script for First Stage
# Run this script to restore your code to the "First Stage" state

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESTORING TO FIRST STAGE BACKUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Confirm with user
$confirmation = Read-Host "This will restore all webapp files to First Stage. Continue? (Y/N)"
if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
    Write-Host "Restore cancelled." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "Step 1: Backing up current state to temp..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$tempBackup = "temp_backup_$timestamp"
robocopy webapp $tempBackup /E /IS /IT /NFL /NDL /NJH /NJS | Out-Null

Write-Host "Step 2: Clearing current webapp folder..." -ForegroundColor Yellow
Remove-Item -Path "webapp\*" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Step 3: Restoring First Stage files..." -ForegroundColor Yellow
robocopy first_stage_backup\webapp webapp /E /IS /IT | Out-Null

Write-Host "Step 4: Restoring firebase.json..." -ForegroundColor Yellow
Copy-Item -Path "first_stage_backup\firebase.json" -Destination "." -Force

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  RESTORE COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Current backup saved to: $tempBackup" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next step: Deploy to Firebase" -ForegroundColor Yellow
Write-Host "Run: firebase deploy --only hosting" -ForegroundColor White
Write-Host ""

$deploy = Read-Host "Deploy to Firebase now? (Y/N)"
if ($deploy -eq 'Y' -or $deploy -eq 'y') {
    Write-Host ""
    Write-Host "Deploying to Firebase..." -ForegroundColor Yellow
    firebase deploy --only hosting
    Write-Host ""
    Write-Host "Deployment complete! Your site is restored to First Stage." -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "Remember to deploy when ready:" -ForegroundColor Yellow
    Write-Host "firebase deploy --only hosting" -ForegroundColor White
}
