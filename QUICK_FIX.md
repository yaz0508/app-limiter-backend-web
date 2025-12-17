# Quick Fix for "Failed to Fetch" Error

## Your Setup
- **Backend URL**: `https://app-limiter-backend-web-2.onrender.com`
- **Vercel Env Var**: Should be set to the same URL (without `/api`)

## Step-by-Step Fix

### 1. Verify Vercel Environment Variable

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Check `VITE_API_URL`:
   - Should be: `https://app-limiter-backend-web-2.onrender.com`
   - Should NOT have `/api` at the end
   - Should NOT have trailing slash

### 2. Update Render CORS Setting

1. Go to https://dashboard.render.com
2. Select your backend service
3. Go to **Environment** tab
4. Find `CORS_ORIGIN`
5. Set it to: `*` (asterisk)
6. Save (Render will auto-redeploy)

### 3. Redeploy Frontend on Vercel

**Important:** After changing environment variables, you MUST redeploy!

1. In Vercel dashboard → **Deployments**
2. Click the three dots (⋯) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (1-2 minutes)

### 4. Test Again

1. Open your Vercel app URL
2. Open browser DevTools (F12) → **Console** tab
3. Try to log in
4. Check for any error messages

## If Still Not Working

### Check Backend Status on Render

1. Go to Render dashboard
2. Check if service status is **"Live"**
3. If it says **"Sleeping"**, wait 30-60 seconds for first request
4. Check **Logs** tab for any errors

### Test Backend Directly

Open in browser:
```
https://app-limiter-backend-web-2.onrender.com/health
```

Should return: `{"status":"ok"}`

### Check Browser Console

Look for specific error:
- **CORS error**: Backend CORS not configured correctly
- **404 error**: API route not found
- **Network error**: Backend not accessible or sleeping
- **Timeout**: Backend taking too long (free tier cold start)

## Common Issues

**Issue:** Environment variable not updating
- **Solution:** Must redeploy Vercel after changing env vars

**Issue:** Backend sleeping (free tier)
- **Solution:** First request takes 30-60 seconds, subsequent requests are fast

**Issue:** CORS blocking requests
- **Solution:** Set `CORS_ORIGIN=*` in Render environment variables

