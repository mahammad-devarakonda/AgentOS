Set-Location "$PSScriptRoot"
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "         Starting AgentOS Backend Server           " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
& ".\.venv\Scripts\python.exe" run.py

