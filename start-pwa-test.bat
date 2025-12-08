@echo off
echo.
echo ========================================
echo   PWA Testing with Ngrok
echo ========================================
echo.
echo Starting Laravel server...
echo.

REM Start Laravel in a new window
start "Laravel Server" cmd /k "cd /d C:\wamp64\www\company-system-main && php artisan serve"

REM Wait 3 seconds for Laravel to start
timeout /t 3 /nobreak > nul

echo.
echo Laravel server started on http://localhost:8000
echo.
echo Starting ngrok tunnel...
echo.

REM Check if ngrok is in PATH or in C:\ngrok
where ngrok >nul 2>&1
if %errorlevel% equ 0 (
    echo Ngrok found in PATH
    start "Ngrok Tunnel" cmd /k "ngrok http 8000"
) else (
    if exist "C:\ngrok\ngrok.exe" (
        echo Ngrok found in C:\ngrok
        start "Ngrok Tunnel" cmd /k "cd /d C:\ngrok && ngrok.exe http 8000"
    ) else (
        echo.
        echo ERROR: Ngrok not found!
        echo.
        echo Please install ngrok:
        echo 1. Download from: https://ngrok.com/download
        echo 2. Extract to: C:\ngrok\
        echo 3. Run this script again
        echo.
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Two windows opened:
echo   1. Laravel Server (http://localhost:8000)
echo   2. Ngrok Tunnel (HTTPS URL)
echo.
echo NEXT STEPS:
echo   1. Look at Ngrok window
echo   2. Copy the HTTPS URL (https://xxx.ngrok.io)
echo   3. Open this URL on your mobile phone
echo   4. Test PWA installation!
echo.
echo Press any key to view this guide again...
pause > nul

echo.
echo ========================================
echo   Testing Instructions
echo ========================================
echo.
echo ON YOUR MOBILE PHONE:
echo   1. Open the ngrok HTTPS URL
echo   2. Login to the system
echo   3. Wait 30 seconds for install prompt
echo   4. Tap "Install" button
echo   5. Check home screen for app icon
echo   6. Tap icon to open app
echo   7. Test offline mode (Airplane mode)
echo.
echo NGROK WEB INTERFACE:
echo   Open in browser: http://localhost:4040
echo   See all requests and responses
echo.
echo TO STOP TESTING:
echo   Press Ctrl+C in both windows
echo   Or simply close the windows
echo.
pause
