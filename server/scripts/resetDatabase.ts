import { prisma } from "../prisma/client";

/**
 * WARNING: This script will delete ALL data from the database!
 * Use with extreme caution. This is a destructive operation.
 */
async function resetDatabase() {
  console.log("⚠️  WARNING: Starting database reset - ALL DATA WILL BE DELETED!");
  console.log("This will delete all:");
  console.log("  - Usage Logs");
  console.log("  - Limits");
  console.log("  - Apps");
  console.log("  - Devices");
  console.log("  - Users");
  console.log("");

  try {
    // Delete in order to respect foreign key constraints
    console.log("Deleting UsageLogs...");
    const deletedUsageLogs = await prisma.usageLog.deleteMany({});
    console.log(`✓ Deleted ${deletedUsageLogs.count} usage logs`);

    console.log("Deleting Limits...");
    const deletedLimits = await prisma.limit.deleteMany({});
    console.log(`✓ Deleted ${deletedLimits.count} limits`);

    console.log("Deleting Apps...");
    const deletedApps = await prisma.app.deleteMany({});
    console.log(`✓ Deleted ${deletedApps.count} apps`);

    console.log("Deleting Devices...");
    const deletedDevices = await prisma.device.deleteMany({});
    console.log(`✓ Deleted ${deletedDevices.count} devices`);

    console.log("Deleting Users...");
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✓ Deleted ${deletedUsers.count} users`);

    console.log("");
    console.log("✅ Database reset completed successfully!");
    console.log("All data has been cleared. The database is now empty.");
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetDatabase()
  .then(() => {
    console.log("Script completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

