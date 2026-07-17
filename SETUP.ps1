# ============================================================
#  SETUP GUIDE — Trie Autocomplete System
#  Prerequisites: Node.js 18+, MSYS2 (g++), CMake 3.16+
# ============================================================

# --------------------------------------------------
#  STEP 1 — Add MSYS2 to System PATH (one-time)
# --------------------------------------------------
# Open PowerShell as Administrator and run:

[Environment]::SetEnvironmentVariable(
  "Path",
  "C:\msys64\ucrt64\bin;C:\msys64\usr\bin;" + [Environment]::GetEnvironmentVariable("Path", "User"),
  "User"
)

# Close and reopen your terminal after this step.
# Verify: g++ --version  (should show GNU 16.1.0)


# --------------------------------------------------
#  STEP 2 — Build the C++ Backend
# --------------------------------------------------
cd backend
mkdir build
cd build

# Generate build files with CMake
cmake -G "MinGW Makefiles" -DCMAKE_CXX_COMPILER=g++ ..

# Compile (uses all CPU cores)
mingw32-make -j4

# Verify the binary exists
# Windows:  trie_cli.exe
# Linux:    trie_cli

cd ..\..

# Quick test — load dictionary and run autocomplete
cd backend\build
.\trie_cli.exe
# > Type: 5  (load dictionary)
# > Path: ..\data\dictionary.txt
# > Type: 3  (autocomplete)
# > Prefix: app
# > K: 5
# > Type: 0  (exit)
cd ..\..


# --------------------------------------------------
#  STEP 3 — Install API Dependencies
# --------------------------------------------------
cd api
npm install
cd ..


# --------------------------------------------------
#  STEP 4 — Install & Build React Frontend
# --------------------------------------------------
cd frontend
npm install
npm run build
cd ..


# --------------------------------------------------
#  STEP 5 — Start the Application
# --------------------------------------------------
cd api
npm start
# Server starts at: http://localhost:3001
# Open that URL in your browser


# ============================================================
#  QUICK COMMAND (run everything in one shot)
# ============================================================
# Paste this entire block into PowerShell:

<#
$env:PATH = "C:\msys64\ucrt64\bin;C:\msys64\usr\bin;" + $env:PATH

Write-Host "=== Building C++ Backend ===" -ForegroundColor Cyan
cd backend
New-Item -ItemType Directory -Force -Path build | Out-Null
cd build
cmake -G "MinGW Makefiles" -DCMAKE_CXX_COMPILER=g++ .. 2>&1 | Write-Host
mingw32-make -j4 2>&1 | Write-Host
cd ..\..

Write-Host "`n=== Installing API Dependencies ===" -ForegroundColor Cyan
cd api
npm install 2>&1 | Write-Host
cd ..

Write-Host "`n=== Building React Frontend ===" -ForegroundColor Cyan
cd frontend
npm install 2>&1 | Write-Host
npm run build 2>&1 | Write-Host
cd ..

Write-Host "`n=== Starting Server ===" -ForegroundColor Green
cd api
node server.js
#>
