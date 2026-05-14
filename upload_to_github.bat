@echo off
echo ========================================
echo   UniPapers GitHub Upload Assistant
echo ========================================

REM 1. Initialize git if not already done
if not exist .git (
    echo [1/4] Initializing Git repository...
    git init
) else (
    echo [1/4] Git already initialized.
)

REM 2. Add all files
echo [2/4] Adding files to staging...
git add .

REM 3. Initial commit
echo [3/4] Creating initial commit...
git commit -m "feat: Initial release of UniPapers platform with full admin controls and review moderation"

REM 4. Instructions for remote
echo.
echo ========================================
echo   NEXT STEPS (MANUAL ACTIONS NEEDED)
echo ========================================
echo 1. Go to https://github.com/mohitsharma-cse/unipaper0
echo 2. Your repository is already created!
echo 3. Run the following commands in this terminal:
echo.
echo    git remote add origin https://github.com/mohitsharma-cse/unipaper0.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo ========================================
pause
