# Deployment Guide

This guide will help you deploy the frontend to Vercel and the backend to Render.

## Prerequisites

1. **GitHub Repository**: Your code should be pushed to GitHub at `https://github.com/yaz0508/app-limiter-backend-web.git`
2. **Vercel Account**: Sign up at https://vercel.com
3. **Render Account**: Sign up at https://render.com
4. **MongoDB Atlas**: Your database connection string (already have this)

---

## Step 1: Deploy Backend to Render

### 1.1 Create Render Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `yaz0508/app-limiter-backend-web`
4. Render will detect the `render.yaml` file automatically

### 1.2 Configure Environment Variables

In the Render dashboard, go to your service → **Environment** tab and add:

```
DATABASE_URL=mongodb+srv://samuelzurbano0508_db_user:3eJ4Xo3BRRROSQhU@cluster0.6kdabsk.mongodb.net/digital-wellbeing?retryWrites=true&w=majority
JWT_SECRET=<generate-a-secure-random-string-here>
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
CORS_ORIGIN=*
INGESTION_API_KEY=<optional-secure-key-for-mobile-app>
```

**Important Notes:**
- **JWT_SECRET**: Generate a secure random string (you can use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- **CORS_ORIGIN**: Set to `*` initially, then update to your Vercel URL after frontend deployment
- **DATABASE_URL**: Use your MongoDB connection string

### 1.3 Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Install dependencies
   - Run `npx prisma generate`
   - Build the TypeScript code
   - Start the server
3. Wait for deployment to complete (usually 2-5 minutes)
4. Copy your Render service URL (e.g., `https://digital-wellbeing-api.onrender.com`)

### 1.4 Verify Backend

Test your backend health endpoint:
```bash
curl https://your-render-url.onrender.com/health
```

Should return: `{"status":"ok"}`

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Import Project

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `yaz0508/app-limiter-backend-web`

### 2.2 Configure Project Settings

**Root Directory**: Set to `client`

**Build Settings:**
- **Framework Preset**: Vite
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `dist` (auto-detected)
- **Install Command**: `npm install`

### 2.3 Set Environment Variables

In the **Environment Variables** section, add:

```
VITE_API_URL=https://your-render-url.onrender.com
```

**Important:** 
- Replace `your-render-url.onrender.com` with your actual Render backend URL
- **Do NOT include `/api` at the end** - the code automatically appends it
- Example: `https://digital-wellbeing-api.onrender.com` (not `...onrender.com/api`)

### 2.4 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (usually 1-3 minutes)
3. Vercel will provide you with a URL (e.g., `https://app-limiter.vercel.app`)

### 2.5 Verify Frontend

1. Visit your Vercel URL
2. You should see the login page
3. Try logging in with: `admin@example.com` / `Demo123!`

---

## Step 3: Update CORS on Render

After you have your Vercel URL:

1. Go back to Render dashboard → Your service → **Environment**
2. Update `CORS_ORIGIN` to your Vercel URL:
   ```
   CORS_ORIGIN=https://your-vercel-app.vercel.app
   ```
3. Or if you have multiple origins, use comma-separated:
   ```
   CORS_ORIGIN=https://your-vercel-app.vercel.app,https://www.your-domain.com
   ```
4. **Redeploy** the service (Render will auto-redeploy when env vars change)

---

## Step 4: Update Frontend API URL (if needed)

If you need to change the API URL after deployment:

1. Go to Vercel dashboard → Your project → **Settings** → **Environment Variables**
2. Update `VITE_API_URL` to your Render backend URL
3. **Redeploy** the project

---

## Troubleshooting

### Backend Issues

**"Prisma Client not generated"**
- Render should auto-run `npx prisma generate` during build
- Check build logs in Render dashboard

**"Database connection failed"**
- Verify `DATABASE_URL` is correct in Render environment variables
- Check MongoDB Atlas IP whitelist (should allow all IPs: `0.0.0.0/0`)

**"Port already in use"**
- Render automatically sets `PORT` environment variable
- Your code should use `process.env.PORT || 4000`

### Frontend Issues

**"Failed to fetch"**
- Check `VITE_API_URL` in Vercel environment variables
- Verify CORS is configured correctly on Render
- Check browser console for specific errors

**"404 on routes"**
- `vercel.json` should handle SPA routing
- Verify `vercel.json` is in the `client` directory

**"Environment variable not found"**
- Vercel requires rebuild after adding env vars
- Trigger a new deployment after adding `VITE_API_URL`

---

## Quick Reference

### Backend URLs
- **Render Dashboard**: https://dashboard.render.com
- **Health Check**: `https://your-render-url.onrender.com/health`
- **API Base**: `https://your-render-url.onrender.com/api`

### Frontend URLs
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Your App**: `https://your-vercel-app.vercel.app`

### Test Credentials
- **Email**: `admin@example.com`
- **Password**: `Demo123!`

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Deploy frontend to Vercel
3. ✅ Update CORS with Vercel URL
4. ✅ Test login and functionality
5. (Optional) Set up custom domains
6. (Optional) Configure MongoDB Atlas IP whitelist for production

