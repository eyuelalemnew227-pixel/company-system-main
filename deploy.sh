#!/bin/bash

# Company Inventory System - Deployment Script
# This script handles deployment on production servers

set -e  # Exit on any error

echo "========================================"
echo "  Deploying Company Inventory System"
echo "========================================"
echo ""

# Configuration
PROJECT_PATH=$(pwd)
PHP_FPM_SERVICE="php8.1-fpm"  # Change to php8.2-fpm if using PHP 8.2
WEB_SERVER="apache2"          # Change to "nginx" if using Nginx
WEB_USER="www-data"           # Change to your web server user

# Step 1: Pull latest code
echo "📥 Pulling latest code from repository..."
git pull origin main || git pull origin abreham
echo "✅ Code updated"
echo ""

# Step 2: Install PHP dependencies
echo "📦 Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction
echo "✅ PHP dependencies installed"
echo ""

# Step 3: Install Node dependencies
echo "📦 Installing Node dependencies..."
npm ci --production=false
echo "✅ Node dependencies installed"
echo ""

# Step 4: Build frontend assets
echo "🔨 Building frontend assets for production..."
export NODE_ENV=production
npm run build
echo "✅ Frontend assets built"
echo ""

# Step 5: Remove Vite hot file (CRITICAL!)
echo "🗑️  Removing Vite hot file..."
rm -f public/hot
echo "✅ Hot file removed"
echo ""

# Step 6: Run database migrations
echo "🗄️  Running database migrations..."
php artisan migrate --force
echo "✅ Migrations completed"
echo ""

# Step 7: Clear all caches
echo "🧹 Clearing application caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
rm -rf bootstrap/cache/*.php
echo "✅ Caches cleared"
echo ""

# Step 8: Optimize application
echo "⚡ Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
echo "✅ Application optimized"
echo ""

# Step 9: Set proper permissions
echo "🔒 Setting file permissions..."
sudo chown -R $WEB_USER:$WEB_USER storage bootstrap/cache public/build
chmod -R 755 storage
chmod -R 755 bootstrap/cache
chmod -R 755 public/build
echo "✅ Permissions set"
echo ""

# Step 10: Restart services
echo "🔄 Restarting services..."
if [ "$WEB_SERVER" = "nginx" ]; then
    sudo systemctl restart $PHP_FPM_SERVICE
    sudo systemctl restart nginx
    echo "✅ Nginx and PHP-FPM restarted"
else
    sudo systemctl restart apache2
    echo "✅ Apache restarted"
fi
echo ""

# Step 11: Verify deployment
echo "🔍 Verifying deployment..."
echo ""

# Check if build files exist
if [ -f "public/build/manifest.json" ]; then
    echo "✅ Build manifest exists"
else
    echo "❌ WARNING: Build manifest not found!"
fi

# Check if hot file is gone
if [ -f "public/hot" ]; then
    echo "❌ WARNING: Hot file still exists!"
else
    echo "✅ Hot file removed"
fi

# Check environment
ENV=$(php artisan env)
echo "✅ Environment: $ENV"

echo ""
echo "========================================"
echo "  ✅ Deployment Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Test the application in browser"
echo "2. Check for console errors (F12)"
echo "3. Verify PWA installation works"
echo "4. Test on mobile devices"
echo ""
echo "If you see ERR_CONNECTION_REFUSED:"
echo "  - Run: rm -f public/hot"
echo "  - Run: npm run build"
echo "  - Run: php artisan config:clear"
echo "  - Restart web server"
echo ""
