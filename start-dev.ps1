# Starts the Trie Autocomplete stack on localhost.
#   API      -> http://localhost:3001
#   Frontend -> http://localhost:5173  (proxies /api to 3001)
#
# Usage:  right-click > "Run with PowerShell"
#     or: powershell -ExecutionPolicy Bypass -File .\start-dev.ps1

$root = $PSScriptRoot

Write-Host "Starting API on http://localhost:3001 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command", "cd '$root\api'; npm start"
)

Start-Sleep -Seconds 2

Write-Host "Starting frontend on http://localhost:5173 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"
)

Start-Sleep -Seconds 5

Write-Host "Opening browser ..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "Both servers run in their own windows. Close those windows to stop them." -ForegroundColor DarkGray
