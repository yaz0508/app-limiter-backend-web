import { ObjectId } from "bson";
import { prisma } from "../prisma/client";
import { findDeviceByIdentifier } from "./deviceService";
import { findOrCreateApp } from "./appService";

/**
 * Analytics Service
 * Provides aggregated analytics data from usage logs.
 * All data is aggregated - no raw logs exposed.
 */

// Helper to get start of day in PH timezone
const getStartOfDayPH = (date: Date): Date => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === "year")!.value);
  const month = parseInt(parts.find(p => p.type === "month")!.value) - 1;
  const day = parseInt(parts.find(p => p.type === "day")!.value);
  const phMidnightUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  return new Date(phMidnightUTC.getTime() - 8 * 60 * 60 * 1000);
};

// Helper to get start of week (Monday) in PH timezone
const getStartOfWeekPH = (date: Date): Date => {
  const phDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const dayOfWeek = phDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  phDate.setDate(phDate.getDate() - daysToMonday);
  phDate.setHours(0, 0, 0, 0);
  return getStartOfDayPH(phDate);
};

// Helper to get start of month in PH timezone
const getStartOfMonthPH = (date: Date): Date => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === "year")!.value);
  const month = parseInt(parts.find(p => p.type === "month")!.value) - 1;
  const phMidnightUTC = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return new Date(phMidnightUTC.getTime() - 8 * 60 * 60 * 1000);
};

// Aggregate usage by app for a date range
const aggregateUsageByApp = async (deviceId: string, start: Date, end: Date) => {
  const pipeline = [
    {
      $match: {
        deviceId: new ObjectId(deviceId),
        occurredAt: { $gte: start, $lte: end },
      },
    },
    {
      $lookup: {
        from: "App",
        localField: "appId",
        foreignField: "_id",
        as: "app",
      },
    },
    { $unwind: "$app" },
    {
      $group: {
        _id: "$appId",
        totalSeconds: { $sum: "$durationSeconds" },
        sessions: { $sum: 1 },
        appName: { $first: "$app.name" },
        packageName: { $first: "$app.packageName" },
      },
    },
    {
      $project: {
        _id: 0,
        appId: "$_id",
        appName: 1,
        packageName: 1,
        sessions: 1,
        totalSeconds: 1,
        totalMinutes: { $divide: ["$totalSeconds", 60] },
      },
    },
    { $sort: { totalSeconds: -1 } },
  ];

  const result = (await prisma.$runCommandRaw({
    aggregate: "UsageLog",
    pipeline,
    cursor: {},
  })) as { cursor?: { firstBatch?: any[] } };

  return result.cursor?.firstBatch ?? [];
};

export const syncAnalyticsData = async (
  deviceIdentifier: string,
  summaries: any[],
  blockEvents: any[]
) => {
  const device = await findDeviceByIdentifier(deviceIdentifier);
  if (!device) {
    throw new Error("DeviceNotRegistered");
  }

  // Store summaries and block events (could create new tables, but for now we'll use existing UsageLog)
  // In a production system, you'd create AppUsageSummary and BlockEvent tables
  // For now, we aggregate from UsageLog on-demand

  return { success: true };
};

export const getDailyAnalyticsSummary = async (deviceId: string) => {
  const today = new Date();
  const start = getStartOfDayPH(today);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);

  const aggregates = await aggregateUsageByApp(deviceId, start, end);
  const totalSeconds = aggregates.reduce((acc, a) => acc + (a.totalSeconds ?? 0), 0);
  const totalMinutes = Math.round(totalSeconds / 60);

  // Get blocked apps count (apps that exceeded limit today)
  const blockedCount = aggregates.filter(a => {
    // Check if app has a limit and exceeded it
    // This would require checking Limit table - simplified for now
    return false;
  }).length;

  return {
    date: start.toISOString(),
    totalMinutes,
    totalSeconds,
    blockedAppsCount: blockedCount,
    byApp: aggregates,
  };
};

export const getWeeklyAnalyticsSummary = async (deviceId: string) => {
  const today = new Date();
  const start = getStartOfWeekPH(today);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);

  const aggregates = await aggregateUsageByApp(deviceId, start, end);
  const totalSeconds = aggregates.reduce((acc, a) => acc + (a.totalSeconds ?? 0), 0);
  const totalMinutes = Math.round(totalSeconds / 60);
  const averageDailyMinutes = Math.round(totalMinutes / 7);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    totalMinutes,
    totalSeconds,
    averageDailyMinutes,
    byApp: aggregates,
  };
};

export const getMonthlyAnalyticsSummary = async (deviceId: string) => {
  const today = new Date();
  const start = getStartOfMonthPH(today);
  const end = new Date(today);

  const aggregates = await aggregateUsageByApp(deviceId, start, end);
  const totalSeconds = aggregates.reduce((acc, a) => acc + (a.totalSeconds ?? 0), 0);
  const totalMinutes = Math.round(totalSeconds / 60);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const averageDailyMinutes = Math.round(totalMinutes / daysInMonth);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    totalMinutes,
    totalSeconds,
    averageDailyMinutes,
    byApp: aggregates,
  };
};

export const getTopAppsSummary = async (
  deviceId: string,
  period: string,
  limit: number
) => {
  const today = new Date();
  let start: Date;
  let end: Date = today;

  if (period === "weekly") {
    start = getStartOfWeekPH(today);
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
  } else {
    start = getStartOfMonthPH(today);
  }

  const aggregates = await aggregateUsageByApp(deviceId, start, end);
  return aggregates.slice(0, limit);
};

export const getBlockEventsSummary = async (deviceId: string, limit: number) => {
  // For now, we don't have a BlockEvent table, so return empty
  // In production, you'd query the BlockEvent table
  // This would require adding BlockEvent model to Prisma schema
  return [];
};
