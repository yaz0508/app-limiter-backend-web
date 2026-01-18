import { prisma } from "../prisma/client";

const PH_OFFSET_MS = 8 * 60 * 60 * 1000; // Asia/Manila is fixed UTC+8 (no DST)

function phDayBoundsFromISODate(dateISO: string): { start: Date; end: Date } {
  // Interpret dateISO as a calendar date in PH timezone.
  const start = new Date(`${dateISO}T00:00:00.000+08:00`);
  const end = new Date(`${dateISO}T23:59:59.999+08:00`);
  return { start, end };
}

function phDateKeyFromMs(ms: number): string {
  return new Date(ms + PH_OFFSET_MS).toISOString().slice(0, 10); // YYYY-MM-DD in PH
}

function phHourFromMs(ms: number): number {
  return new Date(ms + PH_OFFSET_MS).getUTCHours(); // 0-23 in PH
}

export interface HourlyUsage {
  hour: number; // 0-23
  totalMinutes: number;
  appCount: number;
}

export interface DailyHourlyUsage {
  date: string;
  hours: HourlyUsage[];
  totalMinutes: number;
}

export interface PeakUsageHour {
  hour: number;
  averageMinutes: number;
  dayCount: number;
}

/**
 * Get hourly usage for a specific date
 */
export const getHourlyUsage = async (
  deviceId: string,
  dateISO: string
): Promise<HourlyUsage[]> => {
  const { start: startOfDay, end: endOfDay } = phDayBoundsFromISODate(dateISO);

  // Get all usage logs for this device on this date
  const logs = await prisma.usageLog.findMany({
    where: {
      deviceId,
      occurredAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      app: true,
    },
  });

  // Initialize hourly buckets (0-23)
  const hourlyData: Record<number, { totalMinutes: number; apps: Set<string> }> = {};
  for (let hour = 0; hour < 24; hour++) {
    hourlyData[hour] = { totalMinutes: 0, apps: new Set() };
  }

  // Split each log across hour boundaries based on inferred start/end.
  // We only store occurredAt (end) + durationSeconds, so we reconstruct start = end - duration.
  for (const log of logs) {
    const endMs = new Date(log.occurredAt).getTime();
    const durationMs = Math.max(1, log.durationSeconds) * 1000;
    const startMs = endMs - durationMs;

    // Clip to requested day bounds (PH day window expressed in UTC ms)
    const dayStartMs = startOfDay.getTime();
    const dayEndMsExclusive = endOfDay.getTime() + 1;
    let cursor = Math.max(startMs, dayStartMs);
    const end = Math.min(endMs, dayEndMsExclusive);
    if (end <= cursor) continue;

    while (cursor < end) {
      const hour = phHourFromMs(cursor);
      // next hour boundary in PH time
      const phCursor = cursor + PH_OFFSET_MS;
      const nextHourStartUtcMs =
        (Math.floor(phCursor / 3_600_000) + 1) * 3_600_000 - PH_OFFSET_MS;
      const chunkEnd = Math.min(end, nextHourStartUtcMs);
      const minutes = (chunkEnd - cursor) / 60_000;

      hourlyData[hour].totalMinutes += minutes;
      hourlyData[hour].apps.add(log.appId);
      cursor = chunkEnd;
    }
  }

  // Convert to array format
  const result: HourlyUsage[] = [];
  for (let hour = 0; hour < 24; hour++) {
    result.push({
      hour,
      totalMinutes: Math.round(hourlyData[hour].totalMinutes * 100) / 100, // Round to 2 decimals
      appCount: hourlyData[hour].apps.size,
    });
  }

  return result;
};

/**
 * Get hourly usage for a range of dates
 */
export const getDailyHourlyUsage = async (
  deviceId: string,
  startISO: string,
  endISO: string
): Promise<DailyHourlyUsage[]> => {
  // Interpret range as PH dates (inclusive)
  const startDate = new Date(`${startISO}T00:00:00.000+08:00`);
  const endDate = new Date(`${endISO}T23:59:59.999+08:00`);

  // Get all usage logs in the date range
  const logs = await prisma.usageLog.findMany({
    where: {
      deviceId,
      occurredAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      app: true,
    },
  });

  // Group logs by date and hour
  const dailyData: Record<string, Record<number, { totalMinutes: number; apps: Set<string> }>> = {};

  for (const log of logs) {
    const endMs = new Date(log.occurredAt).getTime();
    const durationMs = Math.max(1, log.durationSeconds) * 1000;
    const startMs = endMs - durationMs;

    // Clip to overall range
    const rangeStartMs = startDate.getTime();
    const rangeEndMsExclusive = endDate.getTime() + 1;
    let cursor = Math.max(startMs, rangeStartMs);
    const end = Math.min(endMs, rangeEndMsExclusive);
    if (end <= cursor) continue;

    while (cursor < end) {
      const dateKey = phDateKeyFromMs(cursor);
      const hour = phHourFromMs(cursor);

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {};
        for (let h = 0; h < 24; h++) {
          dailyData[dateKey][h] = { totalMinutes: 0, apps: new Set() };
        }
      }

      const phCursor = cursor + PH_OFFSET_MS;
      const nextHourStartUtcMs =
        (Math.floor(phCursor / 3_600_000) + 1) * 3_600_000 - PH_OFFSET_MS;
      const chunkEnd = Math.min(end, nextHourStartUtcMs);
      const minutes = (chunkEnd - cursor) / 60_000;

      dailyData[dateKey][hour].totalMinutes += minutes;
      dailyData[dateKey][hour].apps.add(log.appId);
      cursor = chunkEnd;
    }
  }

  // Convert to array format
  const result: DailyHourlyUsage[] = [];
  const sortedDates = Object.keys(dailyData).sort();

  for (const dateKey of sortedDates) {
    const hours: HourlyUsage[] = [];
    let dayTotal = 0;

    for (let hour = 0; hour < 24; hour++) {
      const hourData = dailyData[dateKey][hour];
      const totalMinutes = Math.round(hourData.totalMinutes * 100) / 100;
      dayTotal += totalMinutes;
      
      hours.push({
        hour,
        totalMinutes,
        appCount: hourData.apps.size,
      });
    }

    result.push({
      date: dateKey,
      hours,
      totalMinutes: Math.round(dayTotal * 100) / 100,
    });
  }

  return result;
};

/**
 * Get peak usage hours (average usage per hour across multiple days)
 */
export const getPeakUsageHours = async (
  deviceId: string,
  days: number = 7
): Promise<PeakUsageHour[]> => {
  const endKey = new Date(Date.now() + PH_OFFSET_MS).toISOString().slice(0, 10);
  const endDate = new Date(`${endKey}T23:59:59.999+08:00`);
  
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Get all usage logs in the date range
  const logs = await prisma.usageLog.findMany({
    where: {
      deviceId,
      occurredAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      app: true,
    },
  });

  // Group by hour and track which days have usage
  const hourlyStats: Record<number, { totalMinutes: number; days: Set<string> }> = {};
  for (let hour = 0; hour < 24; hour++) {
    hourlyStats[hour] = { totalMinutes: 0, days: new Set() };
  }

  for (const log of logs) {
    const endMs = new Date(log.occurredAt).getTime();
    const durationMs = Math.max(1, log.durationSeconds) * 1000;
    const startMs = endMs - durationMs;

    // Clip to requested range (in UTC ms); we attribute by PH buckets though.
    const rangeStartMs = startDate.getTime();
    const rangeEndMsExclusive = endDate.getTime() + 1;
    let cursor = Math.max(startMs, rangeStartMs);
    const end = Math.min(endMs, rangeEndMsExclusive);
    if (end <= cursor) continue;

    while (cursor < end) {
      const hour = phHourFromMs(cursor);
      const dateKey = phDateKeyFromMs(cursor);

      const phCursor = cursor + PH_OFFSET_MS;
      const nextHourStartUtcMs =
        (Math.floor(phCursor / 3_600_000) + 1) * 3_600_000 - PH_OFFSET_MS;
      const chunkEnd = Math.min(end, nextHourStartUtcMs);
      const minutes = (chunkEnd - cursor) / 60_000;

      hourlyStats[hour].totalMinutes += minutes;
      hourlyStats[hour].days.add(dateKey);
      cursor = chunkEnd;
    }
  }

  // Calculate averages and convert to array
  const result: PeakUsageHour[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const stats = hourlyStats[hour];
    const dayCount = stats.days.size;
    const averageMinutes = dayCount > 0 
      ? Math.round((stats.totalMinutes / dayCount) * 100) / 100
      : 0;

    result.push({
      hour,
      averageMinutes,
      dayCount,
    });
  }

  // Sort by average minutes descending
  result.sort((a, b) => b.averageMinutes - a.averageMinutes);

  return result;
};
