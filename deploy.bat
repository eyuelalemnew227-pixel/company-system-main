@echo off
REM Company Inventory System - Windows Deployment Script

echo ========================================
echo   Deploying Company Inventory System
echo ========================================
echo.

cd /d %~dp0

REM Step 1: Pull latest code
echo Pulling latest code...
git pull origin abreham
if errorlevel 1 (
    echo Warning: Git pull had issues, continuing...
)
echo.

REM Step 2: Install PHP dependencies
echo Installing PHP dependencies...
call composer install --no-dev --optimize-autoloader --no-interaction
echo.

REM Step 3: Install Node dependencies
echo Installing Node dependencies...
call npm ci
echo.

REM Step 4: Build frontend assets
echo Building frontend assets...
set NODE_ENV=production
call npm run build
echo.

REM Step 5: Remove hot file
echo Removing Vite hot file...
if exist public\hot del /F /Q public\hot
echo Hot file removed.
echo.

REM Step 6: Run migrations
echo Running database migrations...
call php artisan migrate --force
echo.

REM Step 7: Clear caches
echo Clearing caches...
call php artisan config:clear
call php artisan cache:clear
call php artisan route:clear
call php artisan view:clear
if exist bootstrap\cache\*.php del /F /Q bootstrap\cache\*.php
echo.

REM Step 8: Optimize
echo Optimizing application...
call php artisan config:cache
call php artisan route:cache
call php artisan view:cache
call php artisan optimize
echo.

echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Please restart your web server (Apache/Nginx)
echo.
echo Verification:
dir public\build\manifest.json
if exist public\hot (
    echo WARNING: Hot file still exists!
) else (
    echo OK: Hot file removed
)
echo.

pause
