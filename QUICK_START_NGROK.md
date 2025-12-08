# 🚀 QUICK START - Test PWA with Ngrok

## ⏱️ Total Time: 5 Minutes

---

## Step 1: Install Ngrok (2 minutes)

1. **Download page is already open in your browser**
   - Or go to: https://ngrok.com/download

2. **Click "Download for Windows"**
   - Save the ZIP file

3. **Extract the ZIP:**
   - Right-click on downloaded file
   - Select "Extract All"
   - Extract to: `C:\ngrok\`
   - Result: You should have `C:\ngrok\ngrok.exe`

✅ **Done!** Ngrok is installed.

---

## Step 2: Start Laravel Server (30 seconds)

Open **Command Prompt** or **PowerShell**:

```bash
cd C:\wamp64\www\company-system-main
php artisan serve
```

You should see:
```
INFO  Server running on [http://127.0.0.1:8000]
```

✅ **Keep this window open!**

---

## Step 3: Start Ngrok (30 seconds)

Open **NEW Command Prompt** or **PowerShell**:

```bash
C:\ngrok\ngrok.exe http 8000
```

You'll see:
```
Forwarding    https://abc123.ngrok.io -> http://localhost:8000
```

✅ **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

---

## Step 4: Test on Mobile (2 minutes)

### **On Your Phone:**

1. **Open Browser (Chrome or Safari)**
   - Type the ngrok URL: `https://abc123.ngrok.io`
   - (Use YOUR actual URL from step 3)

2. **Login to System**
   - Enter username and password
   - Navigate around a bit

3. **Wait 30 Seconds**
   - A popup will appear: "Install Inventory App"
   - Tap **"Install"**

4. **Check Home Screen**
   - Your app icon is now there!
   - Tap it - opens like a real app!

5. **Test Offline:**
   - Keep app open
   - Turn on **Airplane Mode**
   - Should see: "You're offline" (yellow banner)
   - Turn off Airplane Mode
   - Should see: "Back online!" (green banner)

---

## ✅ Success!

Your PWA is working with full HTTPS!

---

## 🔄 Alternative: Use Batch Script

Instead of manual steps 2-3, just **double-click**:

```
start-pwa-test.bat
```

This automatically:
- ✅ Starts Laravel
- ✅ Starts Ngrok
- ✅ Opens both in separate windows

Then just copy the ngrok URL and test on mobile!

---

## 🛑 Stop Testing

When done:
- Press `Ctrl + C` in both windows
- Or just close the windows

---

## 📱 Manual Install (If Auto-Prompt Doesn't Show)

### **Android (Chrome):**
1. Tap **⋮** menu (three dots)
2. Select **"Install app"** or **"Add to Home screen"**
3. Tap **"Install"**

### **iPhone (Safari):**
1. Tap **Share** button (⬆)
2. Scroll and tap **"Add to Home Screen"**
3. Tap **"Add"**

---

## 🎯 What to Test

- [ ] App installs successfully
- [ ] Icon appears on home screen
- [ ] Opens in full screen (no browser bar)
- [ ] Splash screen shows
- [ ] Offline mode works (Airplane mode test)
- [ ] Connection status indicator works
- [ ] All counting features work
- [ ] Forms submit correctly
- [ ] Navigation is smooth

---

## 💡 Pro Tips

**1. Share with Team:**
- Send ngrok URL to colleagues
- They can test from anywhere
- Perfect for remote demos

**2. View Requests:**
- Open: http://localhost:4040
- See all HTTP requests
- Debug issues easily

**3. Keep Testing:**
- Ngrok URL changes each restart (free version)
- Just restart when needed
- Get new URL in ~5 seconds

---

## ⚠️ Important Notes

**Free Ngrok Limits:**
- ✅ Perfect for testing
- ⏱️ Session expires after ~2 hours
- 🔄 Just restart when expired
- 🆓 Completely free!

**URL Changes:**
- New URL each time you restart ngrok
- For stable URL: Sign up for free ngrok account
- Or use paid plan ($8/month) for custom subdomain

---

## 🐛 Troubleshooting

**"ngrok is not recognized":**
```bash
# Use full path:
C:\ngrok\ngrok.exe http 8000
```

**"Connection refused":**
- Make sure Laravel is running first
- Check: http://localhost:8000 in browser

**Install prompt doesn't appear:**
- Wait full 30 seconds
- Refresh page once
- Use manual install (browser menu)

**PWA not working:**
- Make sure using HTTPS ngrok URL
- Clear browser cache
- Try different browser

---

## ✅ Summary

```bash
# 1. Download & extract ngrok to C:\ngrok\

# 2. Terminal 1: Start Laravel
cd C:\wamp64\www\company-system-main
php artisan serve

# 3. Terminal 2: Start ngrok
C:\ngrok\ngrok.exe http 8000

# 4. Copy HTTPS URL from ngrok output

# 5. Open URL on mobile phone

# 6. Install and test!
```

---

## 🎉 You're Ready!

Your PWA is now testable with full HTTPS support on any mobile device!

After successful testing, proceed with production deployment.

See **`NGROK_SETUP_GUIDE.md`** for detailed documentation.
