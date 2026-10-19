@echo off
title Apex Academy - Tuition Management System
echo ==========================================================
echo Starting Apex Academy Tuition Management System...
echo ==========================================================
start "" http://localhost:8085/login.html
powershell -ExecutionPolicy Bypass -File "%~dp0serve.ps1" -Port 8085
pause
