# Apex Academy - Tuition Management System Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting Tuition Management System..." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

Start-Process "http://localhost:8085/login.html"
& "$PSScriptRoot\serve.ps1" -Port 8085
