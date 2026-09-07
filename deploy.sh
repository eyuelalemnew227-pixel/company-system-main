#!/bin/bash

# Laravel + React Deployment Script for Plesk
# Run this script on your Plesk server

echo "Starting deployment..."

# 1. Pull latest code from git
echo "Pulling latest code..."
git pull origin main

# 2. Install/Update PHP dependencies
echo "Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader

# 3. Install/Update Node.js dependencies
echo "Installing Node.js dependencies..."
npm ci

# 4. Build React assets
echo "Building React assets..."
npm run build

# 5. Set proper permissions
echo "Setting permissions..."
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# 6. Clear and cache configurations
echo "Optimizing Laravel..."
php artisan route:clear
php artisan config:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 7. Run database migrations
echo "Running database migrations..."
php artisan migrate --force

# 8. Clear application cache
echo "Clearing caches..."
php artisan cache:clear

echo "Deployment completed successfully!"
