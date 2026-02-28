# Google OAuth Setup Guide

Complete guide to enable Google Sign-In for GATHA.

## ✅ What's Been Added

### Backend Changes
- ✅ Passport.js with Google OAuth 2.0 strategy
- ✅ User model updated (googleId, provider fields)
- ✅ Google OAuth routes (`/api/auth/google`, `/api/auth/google/callback`)
- ✅ Session management with express-session
- ✅ Auto-create users or link existing accounts

### Frontend Changes
- ✅ Google login button on Login page
- ✅ Google login button on Register page
- ✅ Google callback page (`/auth/callback`)
- ✅ authService methods for Google OAuth
- ✅ Token handling from OAuth redirect

## 🔧 Setup Instructions

### Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project** (or select existing)
   - Click "Select a project" → "New Project"
   - Name: "GATHA Community Service"
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Configure consent screen if prompted:
     - User Type: External
     - App name: GATHA
     - User support email: your-email@example.com
     - Developer contact: your-email@example.com
     - Add scopes: email, profile
   - Application type: "Web application"
   - Name: "GATHA Web Client"
   
5. **Add Authorized Redirect URIs**
   ```
   http://localhost:5000/api/auth/google/callback
   http://localhost:8080/auth/callback
   ```
   
   For production, add:
   ```
   https://your-backend-domain.com/api/auth/google/callback
   https://your-frontend-domain.com/auth/callback
   ```

6. **Copy Credentials**
   - Copy **Client ID**
   - Copy **Client Secret**

### Step 2: Update Backend Environment Variables

Edit `backend/.env`:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-actual-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Session Secret (generate a random string)
SESSION_SECRET=your-super-secret-session-key-here
```

**Generate a secure session secret:**
```powershell
# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### Step 3: Restart Backend Server

```powershell
cd backend
npm install  # Dependencies already installed
node server.js
```

Backend will now support Google OAuth!

## 🧪 Testing Google Login

### 1. Start Both Servers

**Backend:**
```powershell
cd backend
node server.js
```

**Frontend:**
```powershell
cd volun-link-main
npm run dev
```

### 2. Test the Flow

1. Open browser: `http://localhost:8080/login`
2. Click **"Continue with Google"** button
3. You'll be redirected to Google sign-in
4. Select your Google account
5. Grant permissions
6. You'll be redirected back to dashboard (logged in!)

### 3. Verify in Database

Check MongoDB:
```javascript
// User document will have:
{
  email: "yourname@gmail.com",
  name: "Your Name", 
  provider: "google",
  googleId: "1234567890...",
  profileImage: "https://lh3.googleusercontent.com/...",
  role: "volunteer"  // default
}
```

## 🔐 How It Works

### Authentication Flow

```
1. User clicks "Continue with Google"
   ↓
2. Frontend: authService.loginWithGoogle()
   → Redirects to: http://localhost:5000/api/auth/google
   ↓
3. Backend: Passport redirects to Google OAuth
   → User signs in with Google
   ↓
4. Google redirects back to: /api/auth/google/callback
   ↓
5. Backend: Creates/updates user, generates JWT tokens
   → Redirects to frontend: /auth/callback?token=...&refreshToken=...
   ↓
6. Frontend: GoogleCallback component
   → Saves tokens to localStorage
   → Fetches user data
   → Redirects to /dashboard
```

### User Creation Logic

**New Google User:**
- Creates account with Google profile data
- No password required (provider: 'google')
- Role defaults to 'volunteer'

**Existing User (same email):**
- Links Google account to existing user
- Updates googleId field
- Can now login with email/password OR Google

## 📝 API Endpoints

### Initiate Google Login
```
GET /api/auth/google
```
Redirects to Google OAuth consent screen.

### Google OAuth Callback
```
GET /api/auth/google/callback
```
Handles Google's redirect, creates/updates user, returns tokens.

### Frontend Callback
```
GET /auth/callback?token=...&refreshToken=...
```
Frontend route that saves tokens and completes login.

## 🛡️ Security Features

- ✅ OAuth 2.0 protocol (industry standard)
- ✅ No password stored for Google users
- ✅ Secure session management
- ✅ JWT tokens for API authentication
- ✅ Account linking prevention (same email)
- ✅ Blocked account detection

## 🐛 Troubleshooting

### Error: "redirect_uri_mismatch"
**Solution:** Add exact callback URL to Google Cloud Console:
- Go to Credentials → Edit OAuth client
- Add: `http://localhost:5000/api/auth/google/callback`

### Error: "Invalid client ID"
**Solution:** Check `.env` file has correct `GOOGLE_CLIENT_ID`

### User redirected but not logged in
**Solution:** 
- Check browser console for errors
- Verify tokens are in localStorage
- Check backend logs for errors

### "Account blocked" message
**Solution:** User's `isBlocked` field is true in database. Admin must unblock.

## 🚀 Production Deployment

### Update Environment Variables

**Backend `.env`:**
```env
GOOGLE_CLIENT_ID=production-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=production-secret
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/auth/google/callback
FRONTEND_URL=https://yourdomain.com
SESSION_SECRET=production-secret-key-minimum-32-characters
```

### Update Google Cloud Console

Add production URLs to Authorized redirect URIs:
```
https://api.yourdomain.com/api/auth/google/callback
https://yourdomain.com/auth/callback
```

### Enable CORS

Backend automatically allows `FRONTEND_URL` in CORS configuration.

## ✅ Features Enabled

- 🔐 **Secure Authentication** - Industry-standard OAuth 2.0
- 👤 **Auto Profile** - Name, email, profile picture from Google
- 🔗 **Account Linking** - Link Google to existing email accounts
- 🚫 **No Password** - Passwordless authentication for Google users
- 📧 **Email Verified** - Google accounts are pre-verified
- 🎨 **Seamless UX** - One-click sign up/login
- 🔄 **Session Management** - Automatic token refresh

## 📊 Testing Checklist

- [ ] Google login button appears on Login page
- [ ] Google login button appears on Register page
- [ ] Clicking button redirects to Google
- [ ] After Google auth, redirects back to app
- [ ] User appears in MongoDB with googleId
- [ ] JWT tokens saved to localStorage
- [ ] User redirected to dashboard
- [ ] User's name and photo appear correctly
- [ ] Logout works properly
- [ ] Can login again with same Google account

## 🎉 You're Done!

Google OAuth is now fully integrated. Users can sign up and log in with one click using their Google accounts!

**Test accounts:**
- Any Gmail account can now log in
- First login creates a new user
- Subsequent logins use existing account

---

For issues or questions, check:
1. Backend console logs
2. Frontend browser console (DevTools)
3. Google Cloud Console audit logs
