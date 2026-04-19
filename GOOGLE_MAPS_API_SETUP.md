# Google Maps API Setup Guide

## Issue
You're seeing this error:
```
ERROR Google Places Dashboard Error: You must use an API key to authenticate each request to Google Maps Platform APIs.
```

This means the Google Maps API key is not configured in your frontend.

---

## Solution

### Step 1: Get Google Maps API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a Project** (if you don't have one)
   - Click "Select a project" → "New Project"
   - Name: "SafeAround" or any name
   - Click "Create"

3. **Enable Required APIs**
   - Go to "APIs & Services" → "Library"
   - Search and enable these APIs:
     - ✅ **Maps SDK for Android**
     - ✅ **Maps SDK for iOS**
     - ✅ **Places API**
     - ✅ **Geocoding API**
     - ✅ **Directions API**
     - ✅ **Distance Matrix API**

4. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key (looks like: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

5. **Restrict API Key (Recommended for Production)**
   - Click on the API key you just created
   - Under "Application restrictions":
     - For development: Select "None"
     - For production: Select "Android apps" or "iOS apps" and add your app's package name
   - Under "API restrictions":
     - Select "Restrict key"
     - Check all the APIs you enabled above
   - Click "Save"

---

### Step 2: Configure Frontend

#### For Development:

1. **Edit `frontend/.env.development`**
   ```bash
   cd frontend
   nano .env.development
   ```

2. **Replace the API key**
   ```bash
   API_URL=http://localhost:8000/api/v1
   WS_URL=ws://localhost:8000
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
   ```

3. **Restart Expo**
   ```bash
   # Stop the current server (Ctrl+C)
   # Clear cache and restart
   npm start -- --clear
   ```

#### For Production:

1. **Edit `frontend/.env.production`**
   ```bash
   nano .env.production
   ```

2. **Replace the API key**
   ```bash
   API_URL=https://yourdomain.com/api/v1
   WS_URL=wss://yourdomain.com/ws
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
   ```

---

### Step 3: Configure Backend (Optional but Recommended)

The backend also uses Google Maps API for geocoding and routes.

1. **Edit `backend/.env`**
   ```bash
   cd backend
   nano .env
   ```

2. **Add the same API key**
   ```bash
   GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

3. **Restart backend**
   ```bash
   # If using Docker
   docker-compose restart backend
   
   # If running locally
   make run
   ```

---

### Step 4: Verify Setup

1. **Check if API key is loaded**
   ```bash
   # In your app, add this temporarily to check
   console.log('Google Maps API Key:', GOOGLE_MAPS_API_KEY);
   ```

2. **Test location search**
   - Open your app
   - Go to Map screen
   - Try searching for a place (e.g., "India Gate")
   - You should see autocomplete suggestions

3. **Check for errors**
   - Open React Native debugger
   - Look for any Google Maps errors
   - Should see no errors now

---

## Common Issues & Solutions

### Issue 1: "API key not valid"
**Solution:**
- Make sure you enabled all required APIs in Google Cloud Console
- Check if API key restrictions are too strict
- Wait 5-10 minutes after creating the key (propagation time)

### Issue 2: "This API project is not authorized"
**Solution:**
- Enable "Places API" in Google Cloud Console
- Enable "Maps SDK for Android" and "Maps SDK for iOS"
- Check billing is enabled (Google requires it even for free tier)

### Issue 3: Still seeing "You must use an API key" error
**Solution:**
```bash
# 1. Stop Expo
Ctrl+C

# 2. Clear cache
cd frontend
rm -rf node_modules/.cache
rm -rf .expo

# 3. Restart with cache clear
npm start -- --clear

# 4. Reload app
Press 'r' in terminal or shake device and reload
```

### Issue 4: API key works in development but not production
**Solution:**
- Make sure `.env.production` has the correct API key
- Build a new production build
- Check if API key restrictions allow your production app

---

## Environment Variables Reference

### Frontend (.env.development)
```bash
# API Configuration
API_URL=http://YOUR_IP:8000/api/v1
WS_URL=ws://YOUR_IP:8000

# Google Maps API Key (REQUIRED)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Expo Project ID (Optional)
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

### Backend (.env)
```bash
# Google Maps API Key (REQUIRED for geocoding & routes)
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Other required variables
DB_PASSWORD=your_password
JWT_SECRET=your_secret
FCM_SERVER_KEY=your_fcm_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

---

## Cost Information

### Google Maps API Pricing (as of 2024)

**Free Tier (Monthly):**
- $200 free credit every month
- Covers approximately:
  - 28,000 map loads
  - 40,000 geocoding requests
  - 40,000 directions requests

**After Free Tier:**
- Maps SDK: $7 per 1,000 loads
- Places API: $17 per 1,000 requests
- Geocoding: $5 per 1,000 requests
- Directions: $5 per 1,000 requests

**For SafeAround:**
- With 1,000 daily active users
- Estimated cost: $0-50/month (usually stays within free tier)

---

## Security Best Practices

### 1. Use Different Keys for Dev/Prod
```bash
# Development key (unrestricted)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy_DEV_KEY

# Production key (restricted)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy_PROD_KEY
```

### 2. Restrict API Keys
- **Development**: No restrictions (for testing)
- **Production**: 
  - Restrict to your app's package name
  - Restrict to specific APIs only
  - Monitor usage in Google Cloud Console

### 3. Never Commit API Keys
```bash
# Add to .gitignore (already done)
.env
.env.local
.env.development
.env.production
```

### 4. Use Environment Variables
- Never hardcode API keys in source code
- Always use `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- Keep keys in `.env` files

---

## Testing Checklist

- [ ] Google Cloud project created
- [ ] All required APIs enabled
- [ ] API key created and copied
- [ ] Frontend `.env.development` updated
- [ ] Frontend `.env.production` updated
- [ ] Backend `.env` updated
- [ ] Expo server restarted with cache clear
- [ ] Backend restarted (if using Docker)
- [ ] Location search tested and working
- [ ] No errors in console
- [ ] Autocomplete suggestions appearing

---

## Quick Fix Command

```bash
# Frontend
cd frontend
echo "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE" >> .env.development
npm start -- --clear

# Backend
cd ../backend
echo "GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE" >> .env
docker-compose restart backend
```

---

## Support

If you're still having issues:

1. **Check Google Cloud Console**
   - Go to "APIs & Services" → "Dashboard"
   - Check if APIs are enabled
   - Check quota usage

2. **Check Logs**
   ```bash
   # Frontend
   # Look at React Native debugger console
   
   # Backend
   docker-compose logs backend | grep "maps"
   ```

3. **Verify API Key**
   ```bash
   # Test API key directly
   curl "https://maps.googleapis.com/maps/api/geocode/json?address=India+Gate&key=YOUR_API_KEY"
   ```

---

## ✅ Done!

After following these steps, your location search should work perfectly! 🎉

**Test it:**
1. Open app
2. Go to Map screen
3. Search for "India Gate, Delhi"
4. Should see autocomplete suggestions
5. Select a place
6. Map should navigate to that location

No more "You must use an API key" errors! 🚀
