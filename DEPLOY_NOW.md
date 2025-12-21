# 🚀 Deploy Shadow Library to Firebase

## Your Firebase Project

- **Project ID:** book-258ee
- **Project Number:** 429711777820
- **Storage Bucket:** book-258ee.firebasestorage.app

## ✅ Quick Deployment Steps

### Step 1: Install Firebase CLI

Open PowerShell and run:

```powershell
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```powershell
firebase login
```

- Browser will open
- Sign in with your Google account
- Allow access

### Step 3: Go to Your Project

```powershell
cd "C:\Users\Medicare\Desktop\Applications\Books app"
```

### Step 4: Initialize Firebase

```powershell
firebase init hosting
```

When prompted:

- **Use existing project?** → Yes
- **Select project:** → book-258ee
- **Public directory?** → Type `webapp` and press Enter
- **Single-page app?** → Type `y` and press Enter
- **Overwrite index.html?** → Type `n` and press Enter

### Step 5: Deploy

```powershell
firebase deploy --only hosting
```

Wait for it to finish. You'll see:

```
✔ Deploy complete!

Hosting URL: https://book-258ee.web.app
```

## 🎉 That's It

Your app will be live at: **<https://book-258ee.web.app>**

---

## 📝 Notes

- The app currently uses local data (books.json)
- No database setup needed for now
- Authentication is optional
- Everything works as-is!

## 🔧 If You Get Errors

**"Firebase command not found"**

- Close and reopen PowerShell after installing Firebase CLI

**"Not authorized"**

- Run `firebase login` again

**"Project not found"**

- Make sure you selected "book-258ee" during init

---

## 🌐 After Deployment

Visit your app at: **<https://book-258ee.web.app>**

Share it with anyone! 🎊
