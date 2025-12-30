import { prisma } from "../prisma/client";

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
  // Parse the date and create start/end boundaries
  const date = new Date(dateISO);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

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

  // Group logs by hour
  for (const log of logs) {
    const logDate = new Date(log.occurredAt);
    const hour = logDate.getHours();
    const minutes = log.durationSeconds / 60;

    hourlyData[hour].totalMinutes += minutes;
    hourlyData[hour].apps.add(log.appId);
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
  const startDate = new Date(startISO);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(endISO);
  endDate.setHours(23, 59, 59, 999);

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
    const logDate = new Date(log.occurredAt);
    const dateKey = logDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = logDate.getHours();
    const minutes = log.durationSeconds / 60;

    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {};
      for (let h = 0; h < 24; h++) {
        dailyData[dateKey][h] = { totalMinutes: 0, apps: new Set() };
      }
    }

    dailyData[dateKey][hour].totalMinutes += minutes;
    dailyData[dateKey][hour].apps.add(log.appId);
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
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date();
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
    const logDate = new Date(log.occurredAt);
    const hour = logDate.getHours();
    const dateKey = logDate.toISOString().split('T')[0];
    const minutes = log.durationSeconds / 60;

    hourlyStats[hour].totalMinutes += minutes;
    hourlyStats[hour].days.add(dateKey);
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
