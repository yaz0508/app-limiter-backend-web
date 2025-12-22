# MongoDB Atlas Connection Troubleshooting

## Issue: Prisma MongoDB Connection Error

If you see errors like:
```
Server selection timeout: No available servers
I/O error: received fatal alert: InternalError
```

This means your backend cannot connect to MongoDB Atlas.

## Step 1: Verify DATABASE_URL Format

Your `DATABASE_URL` in Render should be in this format:

```
mongodb+srv://USERNAME:PASSWORD@cluster0.6kdabsk.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority
```

**Important:**
- Replace `USERNAME` with your MongoDB username
- Replace `PASSWORD` with your MongoDB password (URL-encoded if it contains special characters)
- Replace `DATABASE_NAME` with your database name (e.g., `digital-wellbeing`)
- Include `retryWrites=true&w=majority` for better reliability

**Example:**
```
mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.6kdabsk.mongodb.net/digital-wellbeing?retryWrites=true&w=majority
```

## Step 2: Configure MongoDB Atlas IP Whitelist

MongoDB Atlas blocks connections from unknown IP addresses by default.

### Option A: Allow All IPs (Recommended for Cloud Services)

1. Go to https://cloud.mongodb.com
2. Select your cluster
3. Click **Network Access** (or **Security** → **Network Access**)
4. Click **Add IP Address**
5. Click **Allow Access from Anywhere**
6. Enter `0.0.0.0/0` in the IP address field
7. Click **Confirm**
8. Wait 1-2 minutes for changes to propagate

**Note:** This allows connections from any IP. For production, consider restricting to Render's IP ranges.

### Option B: Allow Specific IPs (More Secure)

1. Go to https://cloud.mongodb.com
2. Select your cluster
3. Click **Network Access**
4. Click **Add IP Address**
5. Enter Render's IP ranges (check Render documentation for current IPs)
6. Click **Confirm**

## Step 3: Verify Database User Credentials

1. Go to https://cloud.mongodb.com
2. Select your cluster
3. Click **Database Access** (or **Security** → **Database Access**)
4. Verify your database user exists and has the correct password
5. Ensure the user has **Read and write** permissions

## Step 4: Check Database Name

1. Go to https://cloud.mongodb.com
2. Click **Browse Collections**
3. Verify your database name (e.g., `digital-wellbeing`)
4. Ensure the database name in `DATABASE_URL` matches exactly

## Step 5: Update Render Environment Variable

1. Go to https://dashboard.render.com
2. Select your backend service
3. Go to **Environment** tab
4. Find `DATABASE_URL`
5. Update it with the correct format:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.6kdabsk.mongodb.net/digital-wellbeing?retryWrites=true&w=majority
   ```
6. **Important:** 
   - Include the database name after the cluster URL
   - URL-encode special characters in password (e.g., `@` becomes `%40`)
   - No quotes around the value
7. Save and wait for redeploy

## Step 6: Test Connection

After updating, check Render logs:
1. Go to your service → **Logs** tab
2. Look for Prisma connection errors
3. If you see connection timeouts, wait 2-3 minutes and try again (IP whitelist changes take time)

## Common Issues

**Issue:** "Server selection timeout"
- **Solution:** Check IP whitelist in MongoDB Atlas - add `0.0.0.0/0` to allow all IPs

**Issue:** "Authentication failed"
- **Solution:** Verify username and password in DATABASE_URL match MongoDB Atlas database user

**Issue:** "Database not found"
- **Solution:** Ensure database name in connection string matches the database in MongoDB Atlas

**Issue:** "SSL/TLS error"
- **Solution:** MongoDB Atlas requires SSL. Ensure connection string uses `mongodb+srv://` (not `mongodb://`)

**Issue:** Password contains special characters
- **Solution:** URL-encode special characters:
  - `@` → `%40`
  - `#` → `%23`
  - `$` → `%24`
  - `%` → `%25`
  - `&` → `%26`
  - `+` → `%2B`
  - `=` → `%3D`

## Quick Test

Test your connection string locally:
```bash
# Install MongoDB shell (optional)
mongosh "mongodb+srv://USERNAME:PASSWORD@cluster0.6kdabsk.mongodb.net/digital-wellbeing?retryWrites=true&w=majority"
```

Or test with Node.js:
```javascript
const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://USERNAME:PASSWORD@cluster0.6kdabsk.mongodb.net/digital-wellbeing?retryWrites=true&w=majority';
const client = new MongoClient(uri);
client.connect().then(() => console.log('Connected!')).catch(console.error);
```

## Next Steps

1. ✅ Fix DATABASE_URL format (include database name)
2. ✅ Configure IP whitelist in MongoDB Atlas
3. ✅ Update Render environment variable
4. ✅ Wait for redeploy
5. ✅ Check logs for successful connection
