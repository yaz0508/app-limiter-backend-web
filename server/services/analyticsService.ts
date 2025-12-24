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

      // For aggregated analytics, we create a single log entry per app per day
      // The backend aggregation will handle summing these up correctly
      // We use occurredAt to represent the date (noon UTC to avoid timezone issues)
      await prisma.usageLog.create({
        data: {
          deviceId: device.id,
          appId: app.id,
          userId: device.userId,
          durationSeconds: durationSeconds,
          occurredAt: date,
        },
      });

      synced++;
    } catch (error) {
      console.error(`[AnalyticsService] Error syncing summary for ${summary.appPackage} on ${summary.date}:`, error);
      errors++;
    }
  }

  console.log(`[AnalyticsService] Synced ${synced} summaries, ${errors} errors for device ${device.id}`);
  return { synced, errors };
};
