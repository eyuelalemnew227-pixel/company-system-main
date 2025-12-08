@echo off
echo Clearing Laravel caches...
cd C:\wamp64\www\company-system-main
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
echo.
echo Caches cleared!
echo.
echo Now restart Laravel server:
echo   php artisan serve
echo.
pause
