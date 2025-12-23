import { Role } from "@prisma/client";
import { ObjectId } from "bson";
import { prisma } from "../prisma/client";
import { findOrCreateApp } from "./appService";
import { findDeviceByIdentifier } from "./deviceService";

export const ingestUsageLog = async (input: {
  deviceIdentifier: string;
  appPackage: string;
  appName?: string;
  durationSeconds: number;
  occurredAt?: Date;
}) => {
  const device = await findDeviceByIdentifier(input.deviceIdentifier);
  if (!device) {
    throw new Error("DeviceNotRegistered");
  }

  const app = await findOrCreateApp(input.appPackage, input.appName);

  return prisma.usageLog.create({
    data: {
      deviceId: device.id,
      appId: app.id,
      userId: device.userId,
      durationSeconds: input.durationSeconds,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
};

type DateRange = { start: Date; end: Date };

const aggregateUsage = async (deviceId: string, range: DateRange) => {
  const pipeline = [
    {
      $match: {
        deviceId: new ObjectId(deviceId),
        occurredAt: { $gte: range.start, $lte: range.end },
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

// Helper to get start of day in PH timezone (UTC+8)
// PH time is UTC+8, so midnight PH = 4 PM UTC previous day
const getStartOfDayPH = (date: Date): Date => {
  // Format date in PH timezone to get the date string
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === "year")!.value);
  const month = parseInt(parts.find(p => p.type === "month")!.value) - 1; // 0-indexed
  const day = parseInt(parts.find(p => p.type === "day")!.value);

  // Create date at midnight PH time (00:00:00 PH = 16:00:00 UTC previous day)
  // We create it as if it were UTC, then adjust
  const phMidnightUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  // PH is UTC+8, so subtract 8 hours to get the UTC equivalent
  return new Date(phMidnightUTC.getTime() - 8 * 60 * 60 * 1000);
};

export const getDailySummary = async (deviceId: string, dateISO?: string) => {
  const target = dateISO ? new Date(dateISO) : new Date();
  // Get start of day in PH timezone (12:00 AM PH = 4:00 PM UTC previous day)
  const start = getStartOfDayPH(target);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);

  const aggregates = await aggregateUsage(deviceId, { start, end });
  const totalSeconds = aggregates.reduce((acc, a) => acc + (a.totalSeconds ?? 0), 0);
  // Always return data structure, even if empty
  return {
    date: start.toISOString(),
    totalSeconds: totalSeconds || 0,
    byApp: aggregates || []
  };
};

export const getWeeklySummary = async (
  deviceId: string,
  startDateISO?: string
) => {
  let normalized: Date;
  if (startDateISO) {
    normalized = getStartOfDayPH(new Date(startDateISO));
  } else {
    // Default to start of current week (Monday) in PH timezone
    const now = new Date();
    const phNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const dayOfWeek = phNow.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday = 0
    phNow.setDate(phNow.getDate() - daysToMonday);
    phNow.setHours(0, 0, 0, 0);
    // Convert back to UTC for database query
    normalized = getStartOfDayPH(phNow);
  }
  const end = new Date(normalized);
  end.setUTCDate(end.getUTCDate() + 7);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);

  const aggregates = await aggregateUsage(deviceId, {
    start: normalized,
    end,
  });
  const totalSeconds = aggregates.reduce((acc, a) => acc + (a.totalSeconds ?? 0), 0);
  // Always return data structure, even if empty
  return {
    start: normalized.toISOString(),
    end: end.toISOString(),
    totalSeconds: totalSeconds || 0,
    byApp: aggregates || [],
  };
};

export const getCustomRangeSummary = async (
  deviceId: string,
  startDateISO: string,
  endDateISO: string
) => {
  const start = new Date(startDateISO);
  const normalizedStart = getStartOfDayPH(start);
  const end = new Date(endDateISO);
  const normalizedEnd = getStartOfDayPH(end);
  normalizedEnd.setUTCDate(normalizedEnd.getUTCDate() + 1);
  normalizedEnd.setUTCMilliseconds(normalizedEnd.getUTCMilliseconds() - 1);

  const aggregates = await aggregateUsage(deviceId, {
    start: normalizedStart,
    end: normalizedEnd,
  });
  const totalSeconds = aggregates.reduce((acc, a) => acc + (a.totalSeconds ?? 0), 0);
  // Always return data structure, even if empty
  return {
    start: normalizedStart.toISOString(),
    end: normalizedEnd.toISOString(),
    totalSeconds: totalSeconds || 0,
    byApp: aggregates || [],
  };
};

export const ensureDeviceAccess = (
  deviceUserId: string,
  requester: Express.UserPayload
) => {
  if (requester.role === Role.ADMIN) return;
  if (deviceUserId !== requester.id) {
    throw new Error("Forbidden");
  }
};


