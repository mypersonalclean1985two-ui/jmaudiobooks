# New App Launch Template 🚀

This folder contains everything you need to launch a **new app** using the same automated pipeline we built for the Books app.

## 📁 Files to Copy

1. **`codemagic.yaml`**: Copy this to your new project's main folder.
2. **`signing/` folder**: Create this folder in your new repo and put your new `.p12` and `.mobileprovision` there.

## 🛠️ Setup Steps for Your New App

### 1. App Store Connect

- Go to App Store Connect and create a **New App**.
- Register a unique **Bundle ID** (e.g., `com.jmaudiobooks.datingapp`).

### 2. Apple Developer Portal

- Create a new **Distribution Provisioning Profile** specifically for your new Bundle ID.
- Download it and name it `app.mobileprovision`.
- Export your **Distribution Certificate** as a `.p12` file.

### 3. CodeMagic Configuration

Create a new project in CodeMagic and add these **Environment Variables**:

**Group: `app_store_credentials`**

- `APP_STORE_CONNECT_KEY_ID`: (Your verified Key ID: `42KRTWG257`)
- `APP_STORE_CONNECT_ISSUER_ID`: (Your verified Issuer ID: `4011d22d-951f-4c98-b615-dc9f657de4d0`)
- `APP_STORE_CONNECT_PRIVATE_KEY`: (Your Private Key text)
- `CM_CERTIFICATE_PASSWORD`: (Your `.p12` password)

**Project Settings**:
Update the `vars` section in the `codemagic.yaml` with your new:

- `BUNDLE_ID`: `com.jmaudiobooks.datingapp`
- `XCODE_SCHEME`: (Usually `App`)

### 4. Info.plist Fix

Make sure to add this to your new app's `ios/App/App/Info.plist` to skip the Encryption Popup:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

---
**You are now ready to launch! Just `git push` and the automation will handle the rest.** 🏁📦
