import { prisma } from "../prisma/client";
import { findDeviceByIdentifier } from "./deviceService";
import { findOrCreateApp } from "./appService";

/**
 * Sync aggregated analytics data from Android app.
 * Receives daily summaries (one per app per day) instead of raw logs.
 */
export const syncAnalytics = async (input: {
  deviceIdentifier: string;
  summaries: Array<{
    appPackage: string;
    appName?: string;
    date: string; // YYYY-MM-DD
    dailyMinutes: number;
    weeklyMinutes?: number;
    monthlyMinutes?: number;
    isBlocked?: boolean;
  }>;
}): Promise<{ synced: number; errors: number }> => {
  const device = await findDeviceByIdentifier(input.deviceIdentifier);
  if (!device) {
    throw new Error("DeviceNotRegistered");
  }

  let synced = 0;
  let errors = 0;

  for (const summary of input.summaries) {
    try {
      // Validate date format (YYYY-MM-DD)
      const dateMatch = summary.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) {
        console.warn(`[AnalyticsService] Invalid date format: ${summary.date}`);
        errors++;
        continue;
      }

      // Validate minutes
      const dailyMinutes = Math.max(0, Math.round(summary.dailyMinutes || 0));
      if (dailyMinutes === 0) {
        // Skip zero-usage entries
        continue;
      }

      // Get or create app (use upsert to handle race conditions)
      // First try findOrCreateApp, but if it fails due to unique constraint, fetch existing
      let app;
      try {
        app = await findOrCreateApp(summary.appPackage, summary.appName);
      } catch (error: any) {
        // Handle race condition: if app was created between check and create
        if (error.code === 'P2002' && error.meta?.target?.includes('packageName')) {
          // App already exists, fetch it
          app = await prisma.app.findUnique({ where: { packageName: summary.appPackage } });
          if (!app) {
            console.error(`[AnalyticsService] Could not find app ${summary.appPackage} after constraint error`);
            errors++;
            continue;
          }
        } else {
          // Re-throw other errors
          throw error;
        }
      }

      // Parse date to Date object (in UTC, but date represents PH timezone day)
      const [year, month, day] = dateMatch.slice(1).map(Number);
      const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // Noon UTC to avoid timezone issues

      // Convert minutes to seconds for storage
      const durationSeconds = dailyMinutes * 60;

      // Check if logs already exist for this app/date/device combination
      // If they exist, update one and delete the rest (deduplication)
      // This prevents duplicate entries from multiple syncs that would cause inflated totals
      const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      const dayEnd = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
      
      const existingLogs = await prisma.usageLog.findMany({
        where: {
          deviceId: device.id,
          appId: app.id,
          occurredAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        orderBy: {
          createdAt: 'desc', // Keep the most recent one
        },
      });

      if (existingLogs.length > 0) {
        // Update the first (most recent) log with new data
        const logToUpdate = existingLogs[0];
        await prisma.usageLog.update({
          where: { id: logToUpdate.id },
          data: {
            durationSeconds: durationSeconds,
            occurredAt: date,
          },
        });
        
        // Delete all other duplicate logs for this app/date/device
        if (existingLogs.length > 1) {
          const duplicateIds = existingLogs.slice(1).map(log => log.id);
          await prisma.usageLog.deleteMany({
            where: {
              id: { in: duplicateIds },
            },
          });
          console.log(`[AnalyticsService] Updated log and deleted ${duplicateIds.length} duplicate(s) for ${summary.appPackage} on ${summary.date}: ${dailyMinutes} minutes`);
        } else {
          console.log(`[AnalyticsService] Updated existing log for ${summary.appPackage} on ${summary.date}: ${dailyMinutes} minutes`);
        }
      } else {
        // Create new log entry
        await prisma.usageLog.create({
          data: {
            deviceId: device.id,
            appId: app.id,
            userId: device.userId,
            durationSeconds: durationSeconds,
            occurredAt: date,
          },
        });
        console.log(`[AnalyticsService] Created new log for ${summary.appPackage} on ${summary.date}: ${dailyMinutes} minutes`);
      }

      synced++;
    } catch (error) {
      console.error(`[AnalyticsService] Error syncing summary for ${summary.appPackage} on ${summary.date}:`, error);
      errors++;
    }
  }

  console.log(`[AnalyticsService] Synced ${synced} summaries, ${errors} errors for device ${device.id}`);
  return { synced, errors };
};
