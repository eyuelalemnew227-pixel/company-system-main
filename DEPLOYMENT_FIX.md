# 🔧 Fix for ERR_CONNECTION_REFUSED on Production Server

## ⚠️ The Problem

When you deploy to your server, you see:
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
app.tsx:1
welcome.tsx:1
@react-refresh:1
```

This means Laravel is trying to load from Vite dev server instead of built assets.

---

## ✅ Complete Fix (Run on Your Server)

### **Step 1: Remove the `hot` File**

```bash
# SSH into your server
cd /path/to/your/project

# Remove the hot file (forces dev mode)
rm -f public/hot
```

### **Step 2: Ensure `.env` is Production**

```bash
# Edit .env
nano .env

# Make sure these are set:
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-actual-domain.com
ASSET_URL=https://your-actual-domain.com
```

### **Step 3: Build Assets on Server**

```bash
# Install Node dependencies
npm install

# Build for production
npm run build

# Verify build exists
ls -la public/build/
# Should see: manifest.json and assets/ folder
```

### **Step 4: Clear ALL Caches**

```bash
# Clear Laravel caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Remove bootstrap cache
rm -rf bootstrap/cache/*

# Recreate cache directory structure
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### **Step 5: Set Proper Permissions**

```bash
# Set ownership (replace www-data with your web server user)
sudo chown -R www-data:www-data storage bootstrap/cache public/build

# Set permissions
chmod -R 755 storage bootstrap/cache
chmod -R 755 public/build
```

### **Step 6: Restart Web Server**

```bash
# For Apache
sudo systemctl restart apache2

# For Nginx + PHP-FPM
sudo systemctl restart php8.1-fpm  # or php8.2-fpm
sudo systemctl restart nginx
```

---

## 🔍 Verify It's Fixed

### **Test 1: Check Build Files Exist**

```bash
ls -la public/build/manifest.json
ls -la public/build/assets/

# Should see many .js and .css files
```

### **Test 2: Check No Hot File**

```bash
ls public/hot
# Should say: No such file or directory
```

### **Test 3: Check .env**

```bash
cat .env | grep APP_ENV
# Should show: APP_ENV=production
```

### **Test 4: Open in Browser**

1. Open your domain: `https://your-domain.com`
2. Press F12 (DevTools)
3. Go to Console tab
4. Should see NO "ERR_CONNECTION_REFUSED"
5. Should load from: `/build/assets/app-xxx.js`

---

## 🎯 Quick Commands (Copy/Paste on Server)

```bash
# Complete fix in one go:
cd /path/to/your/project && \
rm -f public/hot && \
npm install && \
npm run build && \
php artisan config:clear && \
php artisan cache:clear && \
php artisan route:clear && \
php artisan view:clear && \
rm -rf bootstrap/cache/* && \
php artisan config:cache && \
php artisan route:cache && \
php artisan view:cache && \
sudo chown -R www-data:www-data storage bootstrap/cache public/build && \
chmod -R 755 storage bootstrap/cache public/build && \
sudo systemctl restart apache2 && \
echo "✅ Fix complete!"
```

**Note:** Replace `apache2` with `nginx` if you're using Nginx.

---

## 📋 Deployment Checklist

When deploying updates:

- [ ] Pull latest code: `git pull origin main`
- [ ] Install dependencies: `composer install --no-dev --optimize-autoloader`
- [ ] Install Node packages: `npm install`
- [ ] **Build assets: `npm run build`** ← CRITICAL
- [ ] **Remove hot file: `rm -f public/hot`** ← CRITICAL
- [ ] Run migrations: `php artisan migrate --force`
- [ ] Clear caches: `php artisan config:clear && php artisan cache:clear`
- [ ] Optimize: `php artisan config:cache && php artisan route:cache`
- [ ] Set permissions: `chmod -R 755 storage bootstrap/cache`
- [ ] Restart server: `sudo systemctl restart apache2`

---

## 🐛 Still Having Issues?

### **Issue: Still seeing ERR_CONNECTION_REFUSED**

**Solution 1:** Check if Vite dev server is running
```bash
# Kill any Vite process
pkill -f vite
ps aux | grep vite  # Should show nothing
```

**Solution 2:** Force production in AppServiceProvider

Edit `app/Providers/AppServiceProvider.php`:
```php
public function boot(): void
{
    // Force production assets
    if ($this->app->environment('production')) {
        $this->app->usePublicPath(public_path());
    }
    
    // ... rest of code
}
```

### **Issue: Assets not loading (404 errors)**

**Check permissions:**
```bash
ls -la public/build/
# Should be readable by web server

# Fix permissions:
sudo chown -R www-data:www-data public/build
chmod -R 755 public/build
```

### **Issue: Old cached version showing**

**Clear browser cache:**
- Hard refresh: Ctrl + Shift + R
- Or clear cache completely in browser settings

**Clear CDN cache** (if using):
- Clear Cloudflare cache
- Clear any reverse proxy cache

---

## 💡 Why This Happens

Laravel's `@vite()` directive checks for:
1. `public/hot` file existence
2. If exists → tries to connect to dev server
3. If dev server isn't running → ERR_CONNECTION_REFUSED

**The Fix:**
- Remove `public/hot` file
- Ensure `npm run build` was executed
- Built assets exist in `public/build/`
- Laravel automatically uses built assets

---

## ✅ Prevention

### **Add to `.gitignore`:**

```
/public/hot
/public/build/
/node_modules/
```

### **Add to Deployment Script:**

```bash
#!/bin/bash
# deploy.sh

echo "Deploying..."
git pull origin main
composer install --no-dev --optimize-autoloader
npm install
npm run build
rm -f public/hot  # ← Always remove this!
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
sudo systemctl restart apache2
echo "✅ Deployed!"
```

Make executable:
```bash
chmod +x deploy.sh
```

Then just run:
```bash
./deploy.sh
```

---

## 🎉 Success Indicators

After fix, you should see:

**Browser Console:**
```
✅ ServiceWorker registered: ServiceWorkerRegistration
✅ No ERR_CONNECTION_REFUSED errors
✅ Assets loading from: /build/assets/app-xxx.js
```

**Network Tab:**
```
✅ Status 200 for all assets
✅ Loading from /build/assets/ folder
✅ No requests to port 5173 or ::1
```

**Page:**
```
✅ Loads completely
✅ All content visible
✅ Forms work
✅ Navigation works
```

---

## 📞 Summary

**Root Cause:** `public/hot` file exists → forces dev mode → tries dev server → connection refused

**Solution:** Remove `public/hot` + ensure build exists + clear caches + restart server

**Prevention:** Always run `npm run build` and remove `public/hot` when deploying

---

**This should completely fix the ERR_CONNECTION_REFUSED error on your production server!** 🚀
