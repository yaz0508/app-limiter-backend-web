import { prisma } from "../prisma/client";
import { findDeviceByIdentifier } from "./deviceService";
import { findOrCreateApp } from "./appService";

function normalizePhDateKey(dateISO?: string): string | null {
  if (dateISO && /^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    return dateISO;
  }
  return null;
}

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
      // Validate date format (YYYY-MM-DD) in PH day key
      const dateKey = normalizePhDateKey(summary.date);
      if (!dateKey) {
        console.warn(`[AnalyticsService] Invalid date format: ${summary.date}`);
        errors++;
        continue;
      }

      // Validate minutes
      const dailyMinutes = Math.min(24 * 60, Math.max(0, Math.round(summary.dailyMinutes || 0)));
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

      // Upsert daily snapshot (accurate, idempotent per device/app/day)
      await prisma.dailyUsageSnapshot.upsert({
        where: {
          deviceId_appId_date: {
            deviceId: device.id,
            appId: app.id,
            date: dateKey,
          },
        },
        update: {
          totalMinutes: dailyMinutes,
          syncedAt: new Date(),
          source: "analyticsSync",
        },
        create: {
          deviceId: device.id,
          appId: app.id,
          date: dateKey,
          totalMinutes: dailyMinutes,
          source: "analyticsSync",
        },
      });
      console.log(`[AnalyticsService] Upserted snapshot for ${summary.appPackage} on ${dateKey}: ${dailyMinutes} minutes`);

      synced++;
    } catch (error) {
      console.error(`[AnalyticsService] Error syncing summary for ${summary.appPackage} on ${summary.date}:`, error);
      errors++;
    }
  }

  console.log(`[AnalyticsService] Synced ${synced} summaries, ${errors} errors for device ${device.id}`);
  return { synced, errors };
};
