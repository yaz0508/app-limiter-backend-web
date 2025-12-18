# Troubleshooting "Failed to Fetch" / Network Errors

## Issue: Network error connecting to backend

If you see: `Network error: Unable to connect to the server. Please check if the backend is running at https://...`

### Step 1: Verify Your Render Backend URL

1. Go to https://dashboard.render.com
2. Click on your web service (backend)
3. Look at the top of the page - you'll see your service URL
4. It should look like: `https://digital-wellbeing-api.onrender.com` (or similar)
5. **Copy this exact URL** (without `/api` at the end)

### Step 2: Test Backend Health Endpoint

Open in your browser:
```
https://your-actual-render-url.onrender.com/health
```

**Expected response:** `{"status":"ok"}`

If you get an error or timeout:
- Backend might not be deployed
- Backend might be sleeping (free tier)
- Check Render dashboard for deployment status

### Step 3: Update Vercel Environment Variable

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `VITE_API_URL`
5. **Update it** to your actual Render backend URL:
   ```
   https://your-actual-render-url.onrender.com
   ```
   **Important:** 
   - Use the URL from Step 1
   - Do NOT include `/api` at the end
   - Do NOT include trailing slash

### Step 4: Redeploy Frontend

1. In Vercel, go to **Deployments**
2. Click the three dots (⋯) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

### Step 5: Verify Backend is Running

If your Render service is on the free tier, it might be "sleeping":
- First request after sleep takes 30-60 seconds
- Subsequent requests are fast
- Consider upgrading to paid tier for always-on service

### Step 6: Check Browser Console

1. Open your Vercel app
2. Press F12 to open DevTools
3. Go to **Console** tab
4. Try to log in
5. Check the exact error message

### Common Issues

**Issue:** Backend URL is wrong
- **Solution:** Verify the exact URL in Render dashboard and update Vercel env var

**Issue:** Backend is sleeping (free tier)
- **Solution:** Wait 30-60 seconds for first request, or upgrade Render plan

**Issue:** CORS error
- **Solution:** See detailed CORS fix instructions below

**Issue:** 404 on API endpoints
- **Solution:** Verify backend routes are deployed correctly

**Issue:** Environment variable not updated
- **Solution:** Must redeploy Vercel after changing env vars

### Quick Test Commands

Test backend health:
```bash
curl https://your-render-url.onrender.com/health
```

Test login endpoint (should return 400, not 404):
```bash
curl -X POST https://your-render-url.onrender.com/api/auth/login
```

If you get 404, the backend routes aren't working.
If you get 400, the backend is working (400 is expected without body).

---

## Issue: CORS Error

If you see: `CORS error: The backend at https://... is blocking requests from this origin.`

### Quick Fix: Update CORS_ORIGIN on Render

1. Go to https://dashboard.render.com
2. Click on your backend web service
3. Go to **Environment** tab
4. Find the `CORS_ORIGIN` environment variable
5. **Set it to one of these values:**

   **Option A: Allow all origins (recommended for development)**
   ```
   CORS_ORIGIN=*
   ```

   **Option B: Allow specific origins (recommended for production)**
   ```
   CORS_ORIGIN=https://your-vercel-app.vercel.app,https://www.your-domain.com
   ```
   - Use comma-separated list for multiple origins
   - Include protocol (`https://`)
   - No trailing slashes

6. **Save** the environment variable
7. Render will automatically redeploy (or manually trigger redeploy if needed)
8. Wait for deployment to complete (2-5 minutes)

### Verify CORS is Working

After redeploy, check the backend logs in Render:
1. Go to your service → **Logs** tab
2. Look for: `CORS Configuration: { CORS_ORIGIN: '*', allowedOrigins: 'all origins' }`
3. This confirms CORS is configured correctly

### Test CORS from Browser

1. Open your frontend app
2. Open browser DevTools (F12) → **Network** tab
3. Try to log in
4. Check the request headers:
   - Look for `Access-Control-Allow-Origin` header in the response
   - It should match your frontend origin or be `*`

### Common CORS Issues

**Issue:** CORS_ORIGIN is set to a specific URL but doesn't match frontend
- **Solution:** Either set to `*` or add your frontend URL to the comma-separated list

**Issue:** CORS_ORIGIN has extra spaces or quotes
- **Solution:** Remove quotes and spaces - just the value: `*` or `https://example.com`

**Issue:** CORS works in browser but not in production
- **Solution:** Check that the frontend URL in CORS_ORIGIN exactly matches (including https/http, www/non-www)

