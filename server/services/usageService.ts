import { Role } from "@prisma/client";
import { prisma } from "../prisma/client";
import { findOrCreateApp } from "./appService";
import { findDeviceByIdentifier } from "./deviceService";

// Stub functions - implementations were removed
export const ensureDeviceAccess = (
    deviceUserId: string,
    requester: Express.UserPayload
) => {
    if (requester.role === Role.ADMIN) return;
    if (deviceUserId !== requester.id) {
        throw new Error("Forbidden");
    }
};

export const getDailySummary = async (deviceId: string, dateISO?: string) => {
    const date = dateISO ? new Date(dateISO) : new Date();
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

    // Aggregate by app
    const appMap = new Map<string, { appId: string; appName: string; packageName: string; totalSeconds: number; sessions: number }>();
    
    for (const log of logs) {
        const key = log.appId;
        if (!appMap.has(key)) {
            appMap.set(key, {
                appId: log.appId,
                appName: log.app.name,
                packageName: log.app.packageName,
                totalSeconds: 0,
                sessions: 0,
            });
        }
        const entry = appMap.get(key)!;
        entry.totalSeconds += log.durationSeconds;
        entry.sessions += 1;
    }

    const byApp = Array.from(appMap.values()).map(entry => ({
        appId: entry.appId,
        appName: entry.appName,
        packageName: entry.packageName,
        totalMinutes: Math.round((entry.totalSeconds / 60) * 100) / 100,
        totalSeconds: entry.totalSeconds,
        sessions: entry.sessions,
    }));

    const totalSeconds = byApp.reduce((sum, app) => sum + app.totalSeconds, 0);

    return {
        date: date.toISOString().split('T')[0],
        totalSeconds,
        byApp: byApp.sort((a, b) => b.totalSeconds - a.totalSeconds),
    };
};

export const getWeeklySummary = async (deviceId: string, startDateISO?: string) => {
    const start = startDateISO ? new Date(startDateISO) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    // Get all usage logs for this device in the date range
    const logs = await prisma.usageLog.findMany({
        where: {
            deviceId,
            occurredAt: {
                gte: start,
                lte: end,
            },
        },
        include: {
            app: true,
        },
    });

    // Aggregate by app
    const appMap = new Map<string, { appId: string; appName: string; packageName: string; totalSeconds: number; sessions: number }>();
    
    for (const log of logs) {
        const key = log.appId;
        if (!appMap.has(key)) {
            appMap.set(key, {
                appId: log.appId,
                appName: log.app.name,
                packageName: log.app.packageName,
                totalSeconds: 0,
                sessions: 0,
            });
        }
        const entry = appMap.get(key)!;
        entry.totalSeconds += log.durationSeconds;
        entry.sessions += 1;
    }

    const byApp = Array.from(appMap.values()).map(entry => ({
        appId: entry.appId,
        appName: entry.appName,
        packageName: entry.packageName,
        totalMinutes: Math.round((entry.totalSeconds / 60) * 100) / 100,
        totalSeconds: entry.totalSeconds,
        sessions: entry.sessions,
    }));

    const totalSeconds = byApp.reduce((sum, app) => sum + app.totalSeconds, 0);

    return {
        start: start.toISOString(),
        end: end.toISOString(),
        totalSeconds,
        byApp: byApp.sort((a, b) => b.totalSeconds - a.totalSeconds),
    };
};

export const getCustomRangeSummary = async (
    deviceId: string,
    startDateISO: string,
    endDateISO: string
) => {
    const start = new Date(startDateISO);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDateISO);
    end.setHours(23, 59, 59, 999);

    // Get all usage logs for this device in the date range
    const logs = await prisma.usageLog.findMany({
        where: {
            deviceId,
            occurredAt: {
                gte: start,
                lte: end,
            },
        },
        include: {
            app: true,
        },
    });

    // Aggregate by app
    const appMap = new Map<string, { appId: string; appName: string; packageName: string; totalSeconds: number; sessions: number }>();
    
    for (const log of logs) {
        const key = log.appId;
        if (!appMap.has(key)) {
            appMap.set(key, {
                appId: log.appId,
                appName: log.app.name,
                packageName: log.app.packageName,
                totalSeconds: 0,
                sessions: 0,
            });
        }
        const entry = appMap.get(key)!;
        entry.totalSeconds += log.durationSeconds;
        entry.sessions += 1;
    }

    const byApp = Array.from(appMap.values()).map(entry => ({
        appId: entry.appId,
        appName: entry.appName,
        packageName: entry.packageName,
        totalMinutes: Math.round((entry.totalSeconds / 60) * 100) / 100,
        totalSeconds: entry.totalSeconds,
        sessions: entry.sessions,
    }));

    const totalSeconds = byApp.reduce((sum, app) => sum + app.totalSeconds, 0);

    return {
        start: start.toISOString(),
        end: end.toISOString(),
        totalSeconds,
        byApp: byApp.sort((a, b) => b.totalSeconds - a.totalSeconds),
    };
};

export const getDailySeries = async (deviceId: string, days: number) => {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all usage logs for this device in the date range
    const logs = await prisma.usageLog.findMany({
        where: {
            deviceId,
            occurredAt: {
                gte: startDate,
                lte: endDate,
            },
        },
    });

    // Group by date
    const dateMap = new Map<string, { totalSeconds: number; sessions: number }>();
    
    for (const log of logs) {
        const dateKey = new Date(log.occurredAt).toISOString().split('T')[0];
        if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { totalSeconds: 0, sessions: 0 });
        }
        const entry = dateMap.get(dateKey)!;
        entry.totalSeconds += log.durationSeconds;
        entry.sessions += 1;
    }

    // Generate series for all days in range (including days with no data)
    const series: Array<{ date: string; totalSeconds: number; totalMinutes: number; sessions: number }> = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const entry = dateMap.get(dateKey) || { totalSeconds: 0, sessions: 0 };
        
        series.push({
            date: dateKey,
            totalSeconds: entry.totalSeconds,
            totalMinutes: Math.round((entry.totalSeconds / 60) * 100) / 100,
            sessions: entry.sessions,
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return series;
};

export const ingestUsageLog = async (input: {
    deviceIdentifier: string;
    appPackage: string;
    appName?: string;
    durationSeconds: number;
    occurredAt?: Date;
}): Promise<any> => {
    // Basic validation
    let durationSeconds = Math.round(input.durationSeconds);
    if (!durationSeconds || durationSeconds <= 0) {
        throw new Error("Invalid durationSeconds: must be a positive number");
    }
    if (durationSeconds > 86400) {
        console.warn(`[UsageService] Unusually large durationSeconds: ${durationSeconds}s. Clamping to 24 hours.`);
        durationSeconds = 86400;
    }

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
            durationSeconds: durationSeconds,
            occurredAt: occurredAt,
        },
    });

    console.log(`[UsageService] Ingested usage log: device=${device.id}, app=${app.packageName}, duration=${durationSeconds}s`);
    return log;
};
