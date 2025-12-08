@echo off
echo ========================================
echo   Starting Laravel in PRODUCTION mode
echo ========================================
echo.

cd /d C:\wamp64\www\company-system-main

echo Clearing caches...
call php artisan config:clear
call php artisan cache:clear
call php artisan route:clear
call php artisan view:clear

echo.
echo Removing cached config...
del /Q bootstrap\cache\* 2>nul

echo.
echo Setting production environment...
set APP_ENV=production
set APP_DEBUG=false

echo.
echo ========================================
echo   IMPORTANT:
echo   - Keep this window open
echo   - Open NEW terminal for ngrok
echo   - Run: ngrok http 8000
echo ========================================
echo.
echo Starting Laravel server...
echo.
php artisan serve

pause
