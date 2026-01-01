# Database Management Scripts

This directory contains utility scripts for managing the database.

## ⚠️ Reset Database Script

The `resetDatabase.ts` script is a **destructive operation** that will delete **ALL data** from the database.

### What Gets Deleted

The script deletes all data from the following collections (in order to respect foreign key constraints):

- ✅ **Usage Logs** - All app usage tracking data
- ✅ **Limits** - All app usage limits
- ✅ **Apps** - All registered applications
- ✅ **Devices** - All registered devices
- ✅ **Users** - All user accounts

**Note:** The database schema/structure remains intact. Only the data is deleted.

### How to Use

#### Prerequisites

1. Make sure you're in the server directory:
   ```bash
   cd Web-Based-FE-BE/server
   ```

2. Ensure dependencies are installed:
   ```bash
   npm install
   ```

3. Verify your `.env` file has the correct `DATABASE_URL` configured.

#### Running the Reset Script

**Option 1: Using npm script (Recommended)**
```bash
npm run reset:db
```

**Option 2: Direct execution**
```bash
npx ts-node scripts/resetDatabase.ts
```

#### Expected Output

When you run the script, you'll see:
```
⚠️  WARNING: Starting database reset - ALL DATA WILL BE DELETED!
This will delete all:
  - Usage Logs
  - Limits
  - Apps
  - Devices
  - Users

Deleting UsageLogs...
✓ Deleted X usage logs
Deleting Limits...
✓ Deleted X limits
Deleting Apps...
✓ Deleted X apps
Deleting Devices...
✓ Deleted X devices
Deleting Users...
✓ Deleted X users

✅ Database reset completed successfully!
All data has been cleared. The database is now empty.
Script completed.
```

### After Resetting the Database

After running the reset script, you'll need to:

1. **Re-seed the database** with an admin user (optional):
   ```bash
   npm run seed:admin
   ```

2. **Restart your server** if it's currently running:
   ```bash
   npm run dev
   # or
   npm start
   ```

3. **Re-register devices** - All devices will need to be registered again through the Android app.

4. **Re-create users** - All user accounts will need to be created again.

### ⚠️ Important Warnings

- **This operation is IRREVERSIBLE** - Once data is deleted, it cannot be recovered
- **Make backups** if you need to preserve any data
- **Use only in development** or when you're certain you want to clear all data
- **Do NOT run this in production** unless you have a specific reason and have backed up your data

### Use Cases

This script is useful for:
- 🧪 **Development/Testing** - Starting with a clean slate
- 🔄 **Schema Migration** - Clearing data before applying major schema changes
- 🐛 **Debugging** - Removing corrupted or test data
- 🚀 **Fresh Start** - Resetting the entire system

### Troubleshooting

**Error: Cannot connect to database**
- Check your `DATABASE_URL` in the `.env` file
- Ensure MongoDB is running and accessible
- Verify network connectivity

**Error: Permission denied**
- Ensure you have write permissions to the database
- Check your MongoDB user credentials

**Error: Foreign key constraint**
- The script deletes data in the correct order to avoid this
- If you still see this error, check the Prisma schema for any missing relationships

### Related Commands

- `npm run seed:admin` - Create an admin user after reset
- `npm run prisma:push` - Push schema changes to database
- `npm run prisma:generate` - Regenerate Prisma client

