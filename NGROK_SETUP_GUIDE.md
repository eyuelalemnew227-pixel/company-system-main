# 🚀 Ngrok Setup Guide - Test PWA on Mobile with HTTPS

## What is Ngrok?

Ngrok creates a secure HTTPS tunnel to your localhost, allowing you to:
- ✅ Test PWA on real mobile devices
- ✅ Get HTTPS URL instantly (no SSL certificate needed)
- ✅ Share with team members for testing
- ✅ Access from anywhere (not just local network)

---

## 📥 Step 1: Download and Install Ngrok

### **Method 1: Download from Website** ⭐ RECOMMENDED

1. **Go to ngrok website:**
   ```
   https://ngrok.com/download
   ```

2. **Download for Windows:**
   - Click "Download for Windows"
   - You'll get: `ngrok-v3-stable-windows-amd64.zip`

3. **Extract the ZIP file:**
   - Right-click → Extract All
   - Extract to: `C:\ngrok\`
   - You should have: `C:\ngrok\ngrok.exe`

4. **Add to PATH (Optional but recommended):**
   - Press `Win + X` → System
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System Variables", find "Path"
   - Click "Edit" → "New"
   - Add: `C:\ngrok`
   - Click OK on all windows

### **Method 2: Using Chocolatey** (If you have it)

```bash
choco install ngrok
```

### **Method 3: Using Scoop** (If you have it)

```bash
scoop install ngrok
```

---

## 🔑 Step 2: Create Free Ngrok Account (Optional but Recommended)

**Why sign up?**
- Free tier includes: unlimited tunnels, 1 online ngrok agent
- Longer session times
- Custom subdomains (paid)
- No random URL changes

**Sign Up:**
1. Go to: https://dashboard.ngrok.com/signup
2. Sign up with email or Google/GitHub
3. You'll get an authtoken

**Add Authtoken:**
```bash
# Run this once after installing ngrok
C:\ngrok\ngrok.exe config add-authtoken YOUR_AUTH_TOKEN_HERE
```

Or if added to PATH:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

---

## 🚀 Step 3: Start Laravel Server

Open **Command Prompt or PowerShell** and navigate to your project:

```bash
cd C:\wamp64\www\company-system-main

# Start Laravel on port 8000
php artisan serve
```

**Output should show:**
```
INFO  Server running on [http://127.0.0.1:8000]
```

⚠️ **Keep this terminal open!** Don't close it.

---

## 🌐 Step 4: Start Ngrok Tunnel

Open **NEW Command Prompt or PowerShell** (keep Laravel running in first one):

```bash
# If you added ngrok to PATH:
ngrok http 8000

# OR if not in PATH, navigate to ngrok folder:
cd C:\ngrok
.\ngrok.exe http 8000
```

**You'll see something like this:**

```
ngrok

Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:8000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

🎉 **Your HTTPS URL is ready!** Copy the `https://abc123.ngrok.io` URL

---

## 📱 Step 5: Test PWA on Mobile Device

### **On Your Mobile Phone:**

1. **Open the ngrok URL:**
   ```
   https://abc123.ngrok.io
   ```
   ⚠️ Use YOUR actual URL from ngrok output

2. **Login to the system:**
   - Enter your username/password
   - Navigate around the app

3. **Wait 30 seconds:**
   - The install prompt will appear automatically
   - Or proceed to manual install

4. **Install the App:**

   **On Android (Chrome):**
   - Tap the popup: "Install Inventory App" → "Install"
   - OR tap ⋮ menu → "Install app"
   
   **On iPhone (Safari):**
   - Tap Share button (⬆) → "Add to Home Screen"

5. **Check Home Screen:**
   - You should see app icon with your logo
   - Tap it - opens like native app!

6. **Test Offline Mode:**
   - Keep app open
   - Turn on Airplane mode
   - You should see: "You're offline" yellow banner
   - Previously loaded pages still work
   - Turn off Airplane mode
   - Green banner: "Back online!"

---

## 🎯 Quick Commands Summary

```bash
# Terminal 1: Start Laravel
cd C:\wamp64\www\company-system-main
php artisan serve

# Terminal 2: Start ngrok (if in PATH)
ngrok http 8000

# OR if not in PATH:
cd C:\ngrok
.\ngrok.exe http 8000

# Copy the HTTPS URL from ngrok output
# Example: https://abc123.ngrok.io

# Open this URL on your mobile phone
# Wait 30 seconds for install prompt
# Install and test!
```

---

## 🔍 Ngrok Web Interface

Ngrok provides a local web interface to monitor requests:

**Open in browser:**
```
http://localhost:4040
```

**Features:**
- See all HTTP requests
- Inspect request/response details
- Replay requests
- Very useful for debugging!

---

## ⚡ Pro Tips

### **1. Keep URLs Stable (Free Account)**
Every time you restart ngrok, you get a new URL. To avoid this:
- Sign up for free account
- Use authtoken
- URLs still change but less frequently

### **2. Custom Subdomain (Paid)**
With paid plan ($8/month):
```bash
ngrok http --subdomain=mycompany-inventory 8000
# Always get: https://mycompany-inventory.ngrok.io
```

### **3. Share with Team**
Share your ngrok URL with colleagues:
- They can test from anywhere
- No need to be on same network
- Perfect for remote demos

### **4. Secure with Password**
```bash
ngrok http 8000 --auth "username:password"
```

### **5. Save Configuration**
Create `ngrok.yml` for repeated use:
```yaml
version: "2"
authtoken: YOUR_AUTH_TOKEN
tunnels:
  inventory:
    addr: 8000
    proto: http
```

Then run:
```bash
ngrok start inventory
```

---

## 🐛 Troubleshooting

### **"ngrok is not recognized"**
- Ngrok not in PATH
- Use full path: `C:\ngrok\ngrok.exe http 8000`
- Or add to PATH (see Step 1)

### **"Failed to listen on 127.0.0.1:4040"**
- Another ngrok instance is running
- Close it and try again
- Or change web interface port: `ngrok http 8000 --web-addr=127.0.0.1:4041`

### **"Connection refused" on mobile**
- Laravel not running
- Check first terminal - Laravel should be running
- Restart: `php artisan serve`

### **Laravel shows 404**
- URL mismatch in .env
- Don't worry! PWA will still work
- If issues, add to `.env`: `APP_URL=https://your-ngrok-url.ngrok.io`

### **PWA doesn't install**
- Service worker might not register on first load
- Refresh the page once
- Wait 30 seconds
- Or use browser menu to install manually

### **Session timeout**
- Free ngrok sessions expire after 2 hours
- Just restart ngrok to get new session
- Paid plan has longer sessions

---

## 📊 Testing Checklist

Once ngrok is running, test these:

### **Basic Functionality:**
- [ ] Open ngrok URL on mobile
- [ ] Page loads correctly
- [ ] Can login
- [ ] Can navigate to inventory counts
- [ ] Forms work properly

### **PWA Features:**
- [ ] Install prompt appears (after 30 seconds)
- [ ] Can install app
- [ ] App icon appears on home screen
- [ ] App opens in full screen (no browser UI)
- [ ] Splash screen shows (with logo)
- [ ] Offline indicator works
- [ ] Service worker registers (check DevTools)

### **Offline Mode:**
- [ ] Turn on Airplane mode
- [ ] Yellow banner appears: "You're offline"
- [ ] Previously loaded pages still work
- [ ] Turn off Airplane mode
- [ ] Green banner: "Back online!"
- [ ] Data syncs automatically

### **Performance:**
- [ ] Pages load quickly
- [ ] Smooth navigation
- [ ] No lag when typing
- [ ] Images load fast

---

## 🔄 Stopping Ngrok

When you're done testing:

1. **Stop ngrok:**
   - In ngrok terminal: Press `Ctrl + C`

2. **Stop Laravel:**
   - In Laravel terminal: Press `Ctrl + C`

3. **Restart anytime:**
   - Just run the commands again
   - You'll get a new ngrok URL (unless using paid custom subdomain)

---

## 💰 Ngrok Pricing (Optional)

**Free Tier:** ✅
- 1 online ngrok agent
- 40 connections/minute
- Perfect for testing!

**Personal ($8/month):**
- Custom subdomains
- 3 online agents
- 120 connections/minute
- Reserved domains

**Pro ($20/month):**
- IP whitelisting
- More agents and connections
- SSO support

For testing PWA: **Free tier is perfect!** 🎉

---

## 📞 Support

**Ngrok Documentation:**
- https://ngrok.com/docs

**Common Issues:**
- https://ngrok.com/docs/errors

**Community:**
- https://ngrok.com/slack

---

## ✅ Next Steps After Successful Test

Once PWA works perfectly on ngrok:

1. **Collect Feedback:**
   - Note what works well
   - Note any issues
   - Get feedback from test users

2. **Plan Production Deployment:**
   - Choose hosting provider
   - Get SSL certificate
   - Deploy to production

3. **Train Users:**
   - Create video tutorial showing installation
   - Print instruction cards
   - Set up support channel

4. **Roll Out:**
   - Start with pilot group (5-10 counters)
   - Fix any issues
   - Roll out to everyone

---

## 🎉 Summary

**Installation:**
```bash
# Download from: https://ngrok.com/download
# Extract to: C:\ngrok\
# Add to PATH (optional)
```

**Usage:**
```bash
# Terminal 1
php artisan serve

# Terminal 2
ngrok http 8000

# Copy HTTPS URL
# Test on mobile device
```

**Benefits:**
- ✅ Test PWA with real HTTPS
- ✅ No SSL certificate needed
- ✅ Works on mobile instantly
- ✅ Share with team
- ✅ Perfect for demos

**Now you can test the PWA on your mobile phone with full HTTPS support!** 🚀
