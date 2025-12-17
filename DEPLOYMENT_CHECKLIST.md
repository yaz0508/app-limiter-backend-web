# Deployment Checklist

## Pre-Deployment

- [ ] Code is pushed to GitHub repository
- [ ] MongoDB Atlas database is accessible (IP whitelist configured)
- [ ] Test account exists: `admin@example.com` / `Demo123!`

## Backend Deployment (Render)

- [ ] Created Render account
- [ ] Connected GitHub repository to Render
- [ ] Render detected `render.yaml` automatically
- [ ] Set environment variables in Render:
  - [ ] `DATABASE_URL` (MongoDB connection string)
  - [ ] `JWT_SECRET` (generated secure random string)
  - [ ] `JWT_EXPIRES_IN=7d`
  - [ ] `BCRYPT_SALT_ROUNDS=10`
  - [ ] `CORS_ORIGIN=*` (update after frontend deploy)
  - [ ] `INGESTION_API_KEY` (optional)
- [ ] Deployment completed successfully
- [ ] Tested health endpoint: `https://your-render-url.onrender.com/health`
- [ ] Copied Render backend URL

## Frontend Deployment (Vercel)

- [ ] Created Vercel account
- [ ] Connected GitHub repository to Vercel
- [ ] Set Root Directory to `client`
- [ ] Verified build settings (Framework: Vite, Output: dist)
- [ ] Set environment variable:
  - [ ] `VITE_API_URL=https://your-render-url.onrender.com/api`
- [ ] Deployment completed successfully
- [ ] Tested frontend URL loads correctly
- [ ] Copied Vercel frontend URL

## Post-Deployment

- [ ] Updated `CORS_ORIGIN` in Render to Vercel URL
- [ ] Redeployed Render service (auto-redeploys on env change)
- [ ] Tested login on Vercel frontend
- [ ] Verified API calls work from frontend
- [ ] Tested all major features:
  - [ ] Login/Logout
  - [ ] Device management
  - [ ] App limits
  - [ ] Usage analytics

## Optional Enhancements

- [ ] Set up custom domain for frontend
- [ ] Set up custom domain for backend
- [ ] Configure MongoDB Atlas IP whitelist for production
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy

