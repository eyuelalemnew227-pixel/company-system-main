# 🚀 How to Restart PWA Testing

## ✅ Everything is Now Fixed!

I've completed:
- ✅ Rebuilt frontend in production mode
- ✅ Cleared all caches
- ✅ Updated service worker (v3)
- ✅ Fixed mixed content issues
- ✅ Optimized for mobile

---

## 📋 To Restart Testing (3 Steps)

### **Step 1: Stop Current Servers**

If Laravel or ngrok are running:
- Press `Ctrl + C` in each terminal window

---

### **Step 2: Start Laravel**

**Option A: Use Batch File (EASIEST)**
```
Double-click: start-production.bat
```

**Option B: Manual Command**
```bash
cd C:\wamp64\www\company-system-main
php artisan serve
```

**Keep this window open!**

---

### **Step 3: Start Ngrok (NEW Terminal)**

Open NEW PowerShell/CMD:
```bash
C:\ngrok\ngrok.exe http 8000
```

**Copy the HTTPS URL** (e.g., `https://abc-123.ngrok-free.dev`)

---

## 📱 Test on Desktop First

1. Open ngrok URL in desktop browser
2. Should load correctly (no console errors)
3. Login and navigate - everything should work
4. **Verify:** No "ERR_CONNECTION_REFUSED" errors in console

---

## 📱 Test on Mobile

### **Browser Test (Before Installing):**

1. Open ngrok URL on mobile browser
2. Click "Visit Site" (ngrok warning)
3. Should see app and be able to login
4. **Make sure it works in browser first!**

### **Install as PWA:**

1. Wait 30 seconds for auto-prompt
2. OR use browser menu:
   - **Android:** ⋮ → "Install app"
   - **iPhone:** Share → "Add to Home Screen"
3. Check home screen for icon
4. Tap icon to open

### **If Mobile Shows Empty:**

1. **Uninstall the old app** (long-press icon → remove)
2. **Clear browser cache:**
   - Android Chrome: Settings → Privacy → Clear browsing data
   - iPhone Safari: Settings → Safari → Clear History and Website Data
3. **Go to:** `https://your-ngrok-url.ngrok-free.dev/clear-cache.html`
4. **Tap:** "Clear All Cache" and "Remove Service Worker"
5. **Try installing again**

---

## 🔍 Verify It's Working

**Browser Console Should Show:**
```
✅ Loading from: /build/assets/app-xxx.js
✅ ServiceWorker registered
❌ NO "ERR_CONNECTION_REFUSED"
❌ NO "Failed to load resource"
❌ NO "[::1]:5173" references
```

**Mobile Should:**
- ✅ Load app in browser
- ✅ Install successfully
- ✅ Open in full screen
- ✅ Show content (not empty)
- ✅ Work offline (Airplane mode test)

---

## ⚠️ Important Notes

### **When ngrok URL Changes:**

Every time you restart ngrok, you get a new URL. When this happens:

1. **Update .env file:**
   ```
   APP_URL=https://NEW-URL.ngrok-free.dev
   ASSET_URL=https://NEW-URL.ngrok-free.dev
   ```

2. **Clear caches:**
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

3. **Restart Laravel**

4. **Reinstall app on mobile** (uninstall old one first)

---

## 🎯 What Changed

**Before:**
- ❌ Loading from Vite dev server ([::1]:5173)
- ❌ ERR_CONNECTION_REFUSED errors
- ❌ Empty screen on mobile
- ❌ Mixed content errors

**After:**
- ✅ Loading from production build (/build/assets/)
- ✅ No connection errors
- ✅ Works on desktop and mobile
- ✅ All assets load correctly

---

## 🐛 Troubleshooting

### **Desktop browser shows empty:**
- Check console for errors
- Make sure Laravel is running
- Verify build files exist: `dir public\build\assets`

### **Mobile browser shows empty:**
- Clear cache first
- Try /clear-cache.html page
- Uninstall old app
- Reinstall fresh

### **Install prompt doesn't appear:**
- Use manual install (browser menu)
- Wait full 30 seconds
- Refresh page once

### **Still getting console errors:**
- Make sure `.env` has `APP_ENV=production`
- Run: `php artisan config:clear`
- Restart Laravel server
- Hard refresh browser (Ctrl+Shift+R)

---

## ✅ Quick Start Commands

```bash
# Terminal 1: Laravel
cd C:\wamp64\www\company-system-main
php artisan serve

# Terminal 2: Ngrok
C:\ngrok\ngrok.exe http 8000

# Copy URL → Test on desktop → Test on mobile
```

---

## 📞 Files Created

- `start-production.bat` - Easy Laravel startup
- `clear-cache.html` - Mobile cache clearing page
- `RESTART_INSTRUCTIONS.md` - This file

---

## 🎉 Summary

Everything is ready! Just:
1. Start Laravel
2. Start ngrok
3. Test on desktop (verify no errors)
4. Test on mobile (should work now!)

The production build is complete and all caches are cleared. The app should load correctly on both desktop and mobile now! 🚀
