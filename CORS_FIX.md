# Quick Fix: CORS Error

## Problem
You're seeing: "CORS error: The backend at https://app-limiter-backend-web-2.onrender.com/api is blocking requests from this origin."

This happens because the backend's `CORS_ORIGIN` environment variable doesn't include your Vercel frontend URL.

**The error message will now show the exact origin being blocked!** Look for a message like:
```
CORS error: ... blocking requests from origin: https://your-actual-url.vercel.app
```

## Solution

### Step 1: Find Your Actual Frontend Origin

**Option A: Check the error message**
- The error message now shows the exact origin: `blocking requests from origin: https://...`
- Copy that exact URL

**Option B: Check your browser**
- Open browser DevTools (F12)
- Go to Console tab
- The error will show the exact origin

**Option C: Check Vercel dashboard**
1. Go to https://vercel.com/dashboard
2. Click on your project
3. Copy your deployment URL (e.g., `https://app-limiter.vercel.app` or `https://your-project-name.vercel.app`)

**Important:** Copy the **exact URL** including `https://` but **without** any trailing slashes.

### Step 2: Update CORS_ORIGIN on Render

1. Go to https://dashboard.render.com
2. Click on your backend service: `digital-wellbeing-api` (or similar)
3. Go to the **Environment** tab
4. Find the `CORS_ORIGIN` variable
5. Update it to your Vercel URL:

   **Single origin:**
   ```
   https://your-vercel-app.vercel.app
   ```

   **Multiple origins (if you have multiple deployments):**
   ```
   https://your-vercel-app.vercel.app,https://www.your-domain.com
   ```

6. Click **Save Changes**

### Step 3: Redeploy (if needed)

Render should automatically redeploy when you change environment variables. If it doesn't:

1. Go to the **Manual Deploy** tab
2. Click **Deploy latest commit**

### Step 4: Verify

1. Wait for deployment to complete (check the **Logs** tab)
2. Refresh your Vercel frontend
3. The CORS error should be gone

## Troubleshooting

### Still seeing CORS errors?

1. **Check the exact URL:**
   - Make sure there's no trailing slash
   - Make sure it starts with `https://`
   - Check for typos

2. **Check Render logs:**
   - Go to Render dashboard → Your service → **Logs**
   - Look for `[CORS] Rejected origin:` messages
   - The log will show what origin was rejected and what origins are allowed
   - Example: `[CORS] Rejected origin: https://admin-dashboard.vercel.app. Allowed origins: https://old-url.vercel.app`

3. **Multiple deployments:**
   - If you have preview deployments on Vercel, you may need to add multiple origins:
   ```
   https://your-app.vercel.app,https://your-app-git-main.vercel.app
   ```

4. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

## Example

If your Vercel URL is `https://app-limiter-frontend.vercel.app`, set:

```
CORS_ORIGIN=https://app-limiter-frontend.vercel.app
```

Then wait for Render to redeploy and refresh your frontend.
