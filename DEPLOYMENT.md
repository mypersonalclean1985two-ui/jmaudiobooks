# Firebase Deployment Guide

## Prerequisites

1. **Node.js** installed (v16 or higher)
2. **Firebase account** - Create at [firebase.google.com](https://firebase.google.com)

## Setup Steps

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "shadow-library")
4. Disable Google Analytics (optional)
5. Click "Create project"

### 4. Initialize Firebase in Your Project

```bash
cd "C:\Users\Medicare\Desktop\Applications\Books app"
firebase init
```

Select:

- ✅ Firestore
- ✅ Hosting
- ✅ Storage

Follow prompts:

- Use existing project: Select your project
- Firestore rules: `firestore.rules`
- Firestore indexes: `firestore.indexes.json`
- Public directory: `webapp`
- Single-page app: `Yes`
- Storage rules: `storage.rules`

### 5. Get Firebase Config

1. Go to Firebase Console → Project Settings
2. Scroll to "Your apps" → Click "Web" icon (</>)
3. Register app (name: "Shadow Library Web")
4. Copy the `firebaseConfig` object
5. Paste it into `webapp/js/firebase-config.js` (replace the placeholder)

### 6. Enable Authentication

1. Go to Firebase Console → Authentication
2. Click "Get started"
3. Enable sign-in methods:
   - ✅ Google
   - ✅ Email/Password

### 7. Download Service Account Key (for data migration)

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `serviceAccountKey.json` in project root
4. **⚠️ Keep this file secret! Add to .gitignore**

### 8. Install Dependencies

```bash
npm install
```

### 9. Upload Books Data to Firebase

```bash
npm run upload-books
```

This will:

- Upload all books to Firestore
- Upload book covers to Storage (public)
- Upload PDF files to Storage (authenticated access)

### 10. Update HTML to Include Firebase SDK

The `webapp/index.html` needs Firebase SDK scripts. Add before `</body>`:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js"></script>

<!-- Firebase Config -->
<script src="js/firebase-config.js"></script>
```

### 11. Deploy to Firebase

```bash
firebase deploy
```

Or deploy specific services:

```bash
# Deploy hosting only
firebase deploy --only hosting

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules
```

### 12. Access Your App

After deployment, your app will be available at:

```
https://YOUR_PROJECT_ID.web.app
```

## Testing Locally

```bash
firebase serve
```

Visit: `http://localhost:5000`

## Troubleshooting

### Books not loading?

- Check Firebase Console → Firestore Database
- Verify books collection exists
- Check browser console for errors

### Authentication not working?

- Verify auth methods are enabled in Firebase Console
- Check firebaseConfig in `firebase-config.js`

### PDFs not loading?

- Check Storage rules
- Verify user is authenticated
- Check browser console for CORS errors

## Security

- ✅ Firestore rules restrict write access
- ✅ PDFs require authentication
- ✅ Book covers are public (for performance)
- ⚠️ Never commit `serviceAccountKey.json` to Git

## Cost

Firebase Free Tier (Spark Plan) includes:

- 10 GB hosting storage
- 360 MB/day hosting transfer
- 1 GB Firestore storage
- 50K Firestore reads/day
- 5 GB Storage
- Unlimited authentication

Upgrade to Blaze (pay-as-you-go) if you exceed limits.
