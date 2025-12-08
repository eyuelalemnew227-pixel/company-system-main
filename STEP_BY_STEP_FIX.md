# Step-by-Step Guide to Fix Your Plesk 500 Error

## What I Fixed
1. ✅ Fixed the null pointer bug in `EvaluatorCompletionController.php`
2. ✅ Committed and pushed the fix to GitHub
3. ✅ Created deployment scripts for you

## Now Follow These Steps:

---

## OPTION 1: Using Automated Script (Recommended - Easiest)

### Step 1: Access Your Plesk Server
1. Log into Plesk: https://your-plesk-panel.com:8443
2. Go to **"Websites & Domains"**
3. Click on **"systems.kaldisbunna.et"**
4. Click **"SSH Terminal"** (or use your favorite SSH client like PuTTY)

### Step 2: Navigate to Your Application
```bash
cd /var/www/vhosts/systems.kaldisbunna.et/httpdocs
```

### Step 3: Upload and Run the Fix Script

**Option A - Download script directly on server:**
```bash
# Pull the latest code (includes the fix script)
git pull origin abreham

# Make script executable
chmod +x fix-plesk-deployment.sh

# Run the script
./fix-plesk-deployment.sh
```

**Option B - Copy script manually:**
```bash
# Create the script file
nano fix-plesk-deployment.sh

# Copy the entire content from fix-plesk-deployment.sh file and paste it
# Press Ctrl+X, then Y, then Enter to save

# Make it executable
chmod +x fix-plesk-deployment.sh

# Run it
./fix-plesk-deployment.sh
```

### Step 4: Restart PHP-FPM
1. In Plesk, go to **"Websites & Domains"**
2. Click **"PHP Settings"**
3. Click **"Apply"** or find the **"Restart"** button for PHP-FPM

### Step 5: Test Your Website
Visit: https://systems.kaldisbunna.et

✅ **If it works, you're done!**

❌ **If still showing 500 error, continue to troubleshooting below**

---

## OPTION 2: Manual Steps (If script doesn't work)

### Step 1: Connect to Server via SSH
```bash
ssh your-username@systems.kaldisbunna.et
# Or use Plesk SSH Terminal
```

### Step 2: Navigate to Application
```bash
cd /var/www/vhosts/systems.kaldisbunna.et/httpdocs
```

### Step 3: Pull Latest Code
```bash
git pull origin abreham
```
This gets the bug fix I just pushed.

### Step 4: Fix Permissions (MOST IMPORTANT)
```bash
# Make storage and bootstrap/cache writable
chmod -R 775 storage
chmod -R 775 bootstrap/cache

# Change ownership (replace 'username' with your actual username)
chown -R username:psacln storage bootstrap/cache
```

**To find your username, run:**
```bash
whoami
```

### Step 5: Clear All Caches
```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

### Step 6: Run Migrations
```bash
php artisan migrate --force
```

### Step 7: Rebuild Caches for Production
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Step 8: Install/Update Dependencies (if needed)
```bash
composer install --no-dev --optimize-autoloader
```

### Step 9: Restart PHP-FPM
In Plesk:
1. Go to **"Service Management"** (or Tools & Settings → Services)
2. Find **"PHP-FPM"**
3. Click **"Restart"**

Or via command line:
```bash
/usr/local/psa/bin/php_fpm_control restart
```

### Step 10: Test Website
Visit: https://systems.kaldisbunna.et

---

## TROUBLESHOOTING

### Still Getting 500 Error?

#### Check Error Logs:
```bash
# View last 50 lines of Laravel log
tail -50 storage/logs/laravel.log

# View last 20 lines
tail -20 storage/logs/laravel.log
```

#### Check Permissions:
```bash
ls -la storage
ls -la bootstrap/cache
```
You should see `drwxrwxr-x` for directories.

#### Verify Database Connection:
```bash
php artisan tinker
# Then type:
DB::connection()->getPdo();
# Should show PDO object without errors
# Type 'exit' to quit
```

#### Check .env File:
```bash
cat .env | grep DB_
```
Verify:
- DB_HOST=mysql-db02.remote
- DB_PORT=32636
- DB_DATABASE=company_system
- DB_USERNAME=kaldis_database
- DB_PASSWORD=%mSPhq9yoTkwh?33

#### Test PHP:
```bash
php -v
php artisan --version
```

---

## Common Errors and Solutions

### Error: "Permission denied" when running commands
**Solution:**
```bash
# Try with sudo
sudo chmod -R 775 storage bootstrap/cache
sudo chown -R $(whoami):psacln storage bootstrap/cache
```

### Error: "git: command not found"
**Solution:**
Use Plesk File Manager to upload files manually, or install git:
```bash
# Ask your hosting provider to enable git, or
# Download code as ZIP from GitHub and upload via FTP
```

### Error: "Class not found" or "Target class does not exist"
**Solution:**
```bash
composer dump-autoload
php artisan clear-compiled
php artisan optimize
```

### Error: "Connection refused" for database
**Solution:**
1. Check database credentials in `.env`
2. Verify database is running in Plesk
3. Test connection: `php artisan migrate:status`

---

## Quick Copy-Paste Commands (All in One)

```bash
cd /var/www/vhosts/systems.kaldisbunna.et/httpdocs
git pull origin abreham
chmod -R 775 storage bootstrap/cache
chown -R $(whoami):psacln storage bootstrap/cache
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
```

Then restart PHP-FPM in Plesk.

---

## Need Help?

If you're stuck at any step:
1. Copy the error message you're seeing
2. Share which step you're on
3. Share the output from: `tail -30 storage/logs/laravel.log`

---

## Verify Everything is Working

After completing the steps, check:

✅ Website loads without 500 error
✅ Can log in to the system
✅ No errors in browser console (F12)
✅ Check logs: `tail storage/logs/laravel.log` shows no new errors

---

## Document Root Setting (Important!)

Make sure in Plesk:
1. Go to **"Websites & Domains"** → **"systems.kaldisbunna.et"**
2. Click **"Hosting Settings"**
3. **Document Root** should be: `/var/www/vhosts/systems.kaldisbunna.et/httpdocs/public`
4. **NOT** `/httpdocs` (without /public)

---

Good luck! The main issues were:
1. ✅ Code bug (fixed and pushed)
2. ❌ File permissions (you need to fix on server)
3. ❌ Cache needs rebuilding (you need to do on server)
