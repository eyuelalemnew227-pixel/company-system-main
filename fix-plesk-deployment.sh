#!/bin/bash

# Plesk Deployment Fix Script
# Run this on your Plesk server to fix the 500 error

echo "=========================================="
echo "Kaldis Coffee - Plesk Deployment Fix"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "artisan" ]; then
    echo -e "${RED}Error: artisan file not found. Please run this script from your Laravel root directory.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Pulling latest code from Git...${NC}"
git pull origin abreham
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Code updated successfully${NC}"
else
    echo -e "${RED}✗ Failed to pull code. Please check git configuration.${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 2: Installing/Updating Composer dependencies...${NC}"
composer install --no-dev --optimize-autoloader
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Composer dependencies installed${NC}"
else
    echo -e "${RED}✗ Composer install failed${NC}"
fi
echo ""

echo -e "${YELLOW}Step 3: Fixing directory permissions...${NC}"
# Get current user
CURRENT_USER=$(whoami)
echo "Current user: $CURRENT_USER"

# Fix storage permissions
chmod -R 775 storage
chmod -R 775 bootstrap/cache
chown -R $CURRENT_USER:psacln storage bootstrap/cache 2>/dev/null || chown -R $CURRENT_USER:$CURRENT_USER storage bootstrap/cache

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Permissions fixed for storage and bootstrap/cache${NC}"
else
    echo -e "${YELLOW}! Warning: Could not change ownership. Try running: sudo chown -R $CURRENT_USER:psacln storage bootstrap/cache${NC}"
fi
echo ""

echo -e "${YELLOW}Step 4: Clearing all caches...${NC}"
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
echo -e "${GREEN}✓ All caches cleared${NC}"
echo ""

echo -e "${YELLOW}Step 5: Running database migrations...${NC}"
php artisan migrate --force
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database migrations completed${NC}"
else
    echo -e "${RED}✗ Migration failed. Check database credentials in .env${NC}"
fi
echo ""

echo -e "${YELLOW}Step 6: Optimizing for production...${NC}"
php artisan config:cache
php artisan route:cache
php artisan view:cache
echo -e "${GREEN}✓ Application optimized${NC}"
echo ""

echo -e "${YELLOW}Step 7: Final permission check...${NC}"
# Ensure web server can write
find storage -type d -exec chmod 775 {} \;
find storage -type f -exec chmod 664 {} \;
find bootstrap/cache -type d -exec chmod 775 {} \;
find bootstrap/cache -type f -exec chmod 664 {} \;
echo -e "${GREEN}✓ Final permissions set${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}Deployment completed!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart PHP-FPM in Plesk (Websites & Domains → PHP Settings → Restart)"
echo "2. Test your website: https://systems.kaldisbunna.et"
echo "3. Check logs if issues persist: tail -50 storage/logs/laravel.log"
echo ""
