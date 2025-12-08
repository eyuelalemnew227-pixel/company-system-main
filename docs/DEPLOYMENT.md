# Deployment Guide for Plesk

## Issue Encountered
The application was showing CORS errors trying to load assets from `http://[::1]:5173/` (Vite dev server) instead of using the built production assets.

## Solution

### 1. Build Assets for Production
Before deploying, always build your frontend assets:

```bash
npm run build
```

This creates optimized production files in the `public/build` directory.

### 2. Configure Environment for Production

On your Plesk server, update the `.env` file with production settings:

```env
APP_NAME="Your App Name"
APP_ENV=production
APP_KEY=base64:YourAppKeyHere
APP_DEBUG=false
APP_URL=https://systems.kaldisbunna.et

# ... rest of your production settings
```

**Important Environment Variables:**
- `APP_ENV=production` - Must be set to production (not local)
- `APP_DEBUG=false` - Disable debug mode in production
- `APP_URL` - Must match your actual domain

### 3. Deployment Steps for Plesk

1. **Upload Files to Plesk:**
   - Upload all project files to your domain's directory
   - Make sure to include the `public/build` folder with compiled assets
   - Upload `.env` file with production settings

2. **Set Document Root:**
   - In Plesk, set the document root to `/public` (not the project root)
   - Path should be: `/httpdocs/public` or similar

3. **Set PHP Version:**
   - Ensure PHP version is 8.2 or higher
   - Enable required PHP extensions: mbstring, xml, pdo, pdo_mysql, curl, openssl, tokenizer, json

4. **Install Composer Dependencies:**
   ```bash
   composer install --optimize-autoloader --no-dev
   ```

5. **Run Laravel Commands:**
   ```bash
   php artisan migrate --force
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   php artisan optimize
   ```

6. **Set Proper Permissions:**
   ```bash
   chmod -R 755 storage bootstrap/cache
   chown -R www-data:www-data storage bootstrap/cache
   ```

### 4. Important Files to Upload

Make sure these files/folders are uploaded:
- ✅ `public/build/` - Built assets (after running `npm run build`)
- ✅ `vendor/` - PHP dependencies (after `composer install`)
- ✅ `storage/` - With proper permissions
- ✅ `bootstrap/cache/` - With proper permissions
- ✅ `.env` - With production settings
- ❌ **DO NOT upload:** `node_modules/`, `.git/`, `tests/`

### 5. Troubleshooting

**If you still see CORS errors:**
1. Clear browser cache completely
2. Check that `APP_ENV=production` in `.env`
3. Verify `public/build` folder exists and has files
4. Run: `php artisan optimize:clear` then `php artisan optimize`

**If assets are not loading:**
1. Check that document root is set to `/public`
2. Verify `.htaccess` file exists in `public/` folder
3. Enable `mod_rewrite` in Apache settings

**If getting 500 errors:**
1. Check storage folder permissions: `chmod -R 775 storage bootstrap/cache`
2. Check error logs in `storage/logs/laravel.log`
3. Verify database connection in `.env`

### 6. Updating the Application

When you make changes and need to update production:

```bash
# On your local machine
npm run build
git add public/build
git commit -m "Build assets for production"
git push

# On production server
git pull
composer install --optimize-autoloader --no-dev
php artisan migrate --force
php artisan optimize:clear
php artisan optimize
```

## Quick Deployment Checklist

- [ ] Run `npm run build` locally
- [ ] Update `.env` with production settings
- [ ] Upload all files including `public/build/`
- [ ] Set document root to `/public`
- [ ] Run `composer install --no-dev`
- [ ] Run migrations: `php artisan migrate --force`
- [ ] Cache configs: `php artisan optimize`
- [ ] Set permissions: `chmod -R 755 storage bootstrap/cache`
- [ ] Test the application

## Environment Variables Reference

### Production .env Example
```env
APP_NAME="Company System"
APP_ENV=production
APP_KEY=base64:YourGeneratedKeyHere
APP_DEBUG=false
APP_URL=https://systems.kaldisbunna.et

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_production_db
DB_USERNAME=your_db_user
DB_PASSWORD=your_secure_password

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-email-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@kaldisbunna.et"
MAIL_FROM_NAME="${APP_NAME}"
```

## Notes

- Never run Vite dev server (`npm run dev`) on production
- Always use built assets (`npm run build`)
- Keep `APP_DEBUG=false` in production for security
- Regularly backup your database and `.env` file
