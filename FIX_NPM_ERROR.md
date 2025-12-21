# ⚠️ Node.js Required

## The Error You're Seeing

`'npm' is not recognized as an internal or external command`

This means **Node.js is not installed** on your computer.

## ✅ Quick Fix (5 minutes)

### Step 1: Download Node.js

1. Go to: <https://nodejs.org/>
2. Click the **green button** that says "Download Node.js (LTS)"
3. Save the file (it will be something like `node-v20.x.x-x64.msi`)

### Step 2: Install Node.js

1. Double-click the downloaded file
2. Click "Next" through the installer
3. Accept the license agreement
4. Keep all default settings
5. Click "Install"
6. Wait for it to finish
7. Click "Finish"

### Step 3: Verify Installation

1. **Close** the current PowerShell/CMD window
2. Open a **NEW** PowerShell window
3. Type: `node --version`
4. You should see something like: `v20.11.0`

### Step 4: Now Deploy

After Node.js is installed, run the deployment script again:

1. Double-click `deploy.bat` in your Books app folder
2. OR open PowerShell and run:

   ```powershell
   cd "C:\Users\Medicare\Desktop\Applications\Books app"
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy --only hosting
   ```

---

## 🎯 Alternative: Deploy Without Firebase CLI

If you don't want to install Node.js, you can deploy directly from the Firebase Console:

### Option 1: Drag & Drop Deploy

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **book-258ee**
3. Click "Hosting" in the left menu
4. Click "Get started"
5. Drag your entire `webapp` folder into the browser
6. Done! Your app is live!

### Option 2: Use Firebase Web Interface

1. Go to Firebase Console → Hosting
2. Click "Add another site" (if needed)
3. Upload your `webapp` folder
4. Your app will be at: <https://book-258ee.web.app>

---

## 📝 Summary

**Problem:** Node.js not installed  
**Solution:** Download from <https://nodejs.org/> and install  
**Then:** Run `deploy.bat` again

**OR**

**Skip Node.js:** Use Firebase Console drag & drop upload

---

Need help? Let me know which option you prefer!
