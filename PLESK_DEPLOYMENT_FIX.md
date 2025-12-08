# Plesk Deployment Fix Guide

## Issues Found

1. **Permission Error**: Laravel cannot write to `bootstrap/cache` directory
2. **Application Bug**: Null pointer exception in `EvaluatorCompletionController.php` (FIXED)

## Required Steps on Plesk Server

### 1. Fix File Permissions (CRITICAL)

Run these commands via SSH or Plesk Terminal:

```bash
# Navigate to your application directory
cd /var/www/vhosts/systems.kaldisbunna.et/httpdocs

# Set correct ownership (replace 'username' with your Plesk system user)
chown -R username:psacln .

# Fix directory permissions
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;

# Critical: Set writable permissions for Laravel directories
chmod -R 775 storage
chmod -R 775 bootstrap/cache

# Ensure web server can write to these directories
chown -R username:psacln storage bootstrap/cache
```

### 2. Clear and Rebuild Cache

```bash
# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Optimize for production
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 3. Run Database Migrations (if needed)

```bash
php artisan migrate --force
```

### 4. Verify Document Root in Plesk

**Important**: Make sure your domain's document root points to the `public` directory:
- Go to Plesk → Domains → systems.kaldisbunna.et → Hosting Settings
- Document root should be: `/var/www/vhosts/systems.kaldisbunna.et/httpdocs/public`

### 5. Check .htaccess File

Ensure `public/.htaccess` exists and contains:

```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
```

### 6. Check PHP Settings in Plesk

- Go to Plesk → PHP Settings
- Ensure these are enabled:
  - `mod_rewrite` extension
  - `pdo_mysql` extension
  - `mbstring` extension
  - `openssl` extension
  - `tokenizer` extension
  - `xml` extension
  - `ctype` extension
  - `json` extension

### 7. Test Database Connection

```bash
php artisan tinker
# Then run:
DB::connection()->getPdo();
# Should show: PDO connection object without errors
```

## Quick Deployment Checklist

After uploading code to Plesk:

```bash
# 1. Fix permissions
chmod -R 775 storage bootstrap/cache

# 2. Clear caches
php artisan optimize:clear

# 3. Cache config for production
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 4. Run migrations
php artisan migrate --force

# 5. Restart PHP-FPM (in Plesk UI or via command)
# Plesk → Service Management → PHP-FPM → Restart
```

## Common Plesk Issues

### Issue: 500 Internal Server Error
**Causes**:
- Wrong file permissions (755 for directories, 644 for files)
- `storage/` or `bootstrap/cache/` not writable
- Missing `.env` file or wrong configuration
- Document root not pointing to `/public` directory

### Issue: Database Connection Error
**Check**:
- `.env` file has correct database credentials
- Database host, port, username, password are correct
- Database exists and user has proper privileges
- Run: `php artisan config:clear` after changing `.env`

### Issue: Assets Not Loading (CSS/JS 404)
**Check**:
- Run: `npm run build` locally before deployment
- Ensure `public/build` directory is uploaded
- Check `.env` has: `APP_URL=https://systems.kaldisbunna.et`
- Clear cache: `php artisan config:cache`

## Production Environment Variables

Ensure your `.env` has these settings for production:

```env
APP_ENV=production
APP_DEBUG=false
LOG_LEVEL=error

SESSION_DOMAIN=systems.kaldisbunna.et
APP_URL=https://systems.kaldisbunna.et
```

## Troubleshooting Commands

```bash
# View recent logs
tail -n 50 storage/logs/laravel.log

# Check Laravel configuration
php artisan config:show

# Test database connection
php artisan migrate:status

# Check application status
php artisan about

# Clear everything and recache
php artisan optimize:clear && php artisan optimize
```

## File Upload via Git Deployment Hook

If using Git deployment in Plesk, add this to your deployment script:

```bash
#!/bin/bash

# Navigate to repository
cd /var/www/vhosts/systems.kaldisbunna.et/httpdocs

# Install dependencies
composer install --no-dev --optimize-autoloader
npm ci && npm run build

# Fix permissions
chmod -R 775 storage bootstrap/cache

# Clear and cache
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations
php artisan migrate --force

# Restart PHP-FPM
/usr/local/psa/bin/php_fpm_control restart
```

## Security Note

**NEVER** set permissions to 777 in production! Use 775 for directories and 644 for files.
