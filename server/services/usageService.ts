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

  const occurredAt = input.occurredAt ?? new Date();
  const log = await prisma.usageLog.create({
    data: {
      deviceId: device.id,
      appId: app.id,
      userId: device.userId,
      durationSeconds: input.durationSeconds,
      occurredAt: occurredAt,
    },
  });

  console.log(`[UsageService] Ingested usage log: device=${device.id}, app=${app.packageName}, duration=${input.durationSeconds}s, occurredAt=${occurredAt.toISOString()}`);

  return log;
};

type DateRange = { start: Date; end: Date };

// Helper to check if a package is a system/OEM app that shouldn't be shown in analytics
const isSystemApp = (packageName: string): boolean => {
  const lowerPkg = packageName.toLowerCase();

  // Android system apps
  if (lowerPkg.startsWith('com.android.systemui') ||
    lowerPkg.startsWith('com.android.settings') ||
    lowerPkg === 'android' ||
    lowerPkg.startsWith('android.')) {
    return true;
  }

  // Common OEM system apps (Transsion, Samsung, Xiaomi, etc.)
  // Check for Transsion apps (can be com.transsion.* or *.transsion)
  if (lowerPkg.startsWith('com.transsion.') ||
    lowerPkg.includes('.transsion') ||
    lowerPkg.startsWith('com.samsung.android.') ||
    lowerPkg.startsWith('com.miui.') ||
    lowerPkg.startsWith('com.xiaomi.') ||
    lowerPkg.startsWith('com.huawei.') ||
    lowerPkg.startsWith('com.oppo.') ||
    lowerPkg.startsWith('com.coloros.') ||
    lowerPkg.startsWith('com.vivo.') ||
    lowerPkg.startsWith('com.oneplus.')) {
    return true;
  }

  // Specific ColorOS and other system apps
  if (lowerPkg === 'com.coloros.gesture' ||
    lowerPkg === 'com.coloros.gallery3d' ||
    lowerPkg === 'ai.character.app' ||
    lowerPkg === 'com.coloros.wirelesssettings' ||
    lowerPkg === 'com.coloros.filemanager') {
    return true;
  }

  // Google system services (but not user apps like Gmail, Maps)
  if (lowerPkg.startsWith('com.google.android.gms') ||
    lowerPkg.startsWith('com.google.android.apps.nexuslauncher') ||
    lowerPkg.startsWith('com.google.android.setupwizard') ||
    lowerPkg.startsWith('com.google.android.inputmethod') || // Google Keyboard and other input methods
    lowerPkg.startsWith('com.google.android.apps.inputmethod')) { // Google Input Tools
    return true;
  }

  // Input methods (keyboards) - system apps
  if (lowerPkg.includes('inputmethod') || lowerPkg.includes('keyboard')) {
    return true;
  }

  return false;
};

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
    {
      $unwind: {
        path: "$app",
        preserveNullAndEmptyArrays: false
      }
    },
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

  // First, check if there are any logs to aggregate
  const logCount = await prisma.usageLog.count({
    where: {
      deviceId: deviceId,
      occurredAt: { gte: range.start, lte: range.end },
    },
  });

  if (logCount === 0) {
    console.log(`[UsageService] No logs found for aggregation`);
    return [];
  }

  console.log(`[UsageService] Found ${logCount} logs to aggregate, attempting MongoDB aggregation...`);

  try {
    const result = (await prisma.$runCommandRaw({
      aggregate: "UsageLog",
      pipeline,
      cursor: {},
    })) as { cursor?: { firstBatch?: any[] } };

    let aggregates = result.cursor?.firstBatch ?? [];

    // Filter out system apps
    aggregates = aggregates.filter((item: any) => !isSystemApp(item.packageName || ''));

    console.log(`[UsageService] MongoDB aggregation result: ${aggregates.length} apps found (after filtering system apps)`);

    // If we have logs but aggregation returned 0, use fallback
    if (logCount > 0 && aggregates.length === 0) {
      console.log(`[UsageService] MongoDB aggregation returned 0 results despite ${logCount} logs, using Prisma fallback...`);
      throw new Error("Aggregation returned empty results");
    }

    if (aggregates.length > 0) {
      console.log(`[UsageService] Sample aggregate:`, JSON.stringify(aggregates[0], null, 2));
    }
    return aggregates;
  } catch (error) {
    console.error(`[UsageService] MongoDB aggregation error or empty result, using Prisma fallback:`, error);
    // Fallback: use Prisma's native queries (more reliable)
    const logs = await prisma.usageLog.findMany({
      where: {
        deviceId: deviceId,
        occurredAt: { gte: range.start, lte: range.end },
      },
      include: { app: true },
    });

    console.log(`[UsageService] Fallback: Found ${logs.length} logs via Prisma`);

    // Manual aggregation
    const grouped = new Map<string, { totalSeconds: number; sessions: number; app: any }>();
    for (const log of logs) {
      if (!log.app) {
        console.warn(`[UsageService] Log ${log.id} has no app relation, skipping`);
        continue;
      }
      const key = log.appId;
      const existing = grouped.get(key) || { totalSeconds: 0, sessions: 0, app: log.app };
      existing.totalSeconds += log.durationSeconds;
      existing.sessions += 1;
      grouped.set(key, existing);
    }

    const result = Array.from(grouped.entries())
      .map(([appId, data]) => ({
        appId,
        appName: data.app.name,
        packageName: data.app.packageName,
        totalSeconds: data.totalSeconds,
        totalMinutes: data.totalSeconds / 60,
        sessions: data.sessions,
      }))
      .filter(item => !isSystemApp(item.packageName)) // Filter out system apps
      .sort((a, b) => b.totalSeconds - a.totalSeconds);

    console.log(`[UsageService] Fallback aggregation result: ${result.length} apps found (after filtering system apps)`);
    return result;
  }
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

  console.log(`[UsageService] getDailySummary: deviceId=${deviceId}, start=${start.toISOString()}, end=${end.toISOString()}`);

  // First, check if there are any usage logs for this device at all
  const totalLogs = await prisma.usageLog.count({
    where: { deviceId: deviceId }
  });
  console.log(`[UsageService] Total usage logs for device: ${totalLogs}`);

  // Check logs in the date range
  const logsInRange = await prisma.usageLog.count({
    where: {
      deviceId: deviceId,
      occurredAt: { gte: start, lte: end }
    }
  });
  console.log(`[UsageService] Usage logs in date range: ${logsInRange}`);

  // Debug: Check a sample log to see its structure
  if (logsInRange > 0) {
    const sampleLog = await prisma.usageLog.findFirst({
      where: {
        deviceId: deviceId,
        occurredAt: { gte: start, lte: end }
      },
      include: { app: true }
    });
    console.log(`[UsageService] Sample log:`, {
      deviceId: sampleLog?.deviceId,
      appId: sampleLog?.appId,
      appName: sampleLog?.app?.name,
      durationSeconds: sampleLog?.durationSeconds,
      occurredAt: sampleLog?.occurredAt
    });
  }

  const aggregates = await aggregateUsage(deviceId, { start, end });
  const totalSeconds = aggregates.reduce((acc, a) => acc + (a.totalSeconds ?? 0), 0);

  console.log(`[UsageService] Aggregated ${aggregates.length} apps, totalSeconds: ${totalSeconds}`);

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


