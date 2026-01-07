import { Role } from "@prisma/client";
import { prisma } from "../prisma/client";
import { findOrCreateApp } from "./appService";
import { findDeviceByIdentifier } from "./deviceService";

const PH_OFFSET_MS = 8 * 60 * 60 * 1000; // Asia/Manila fixed UTC+8 (no DST)

function phDayBounds(dateISO?: string): { start: Date; end: Date; dateKey: string } {
    const dateKey = dateISO
        ? dateISO
        : new Date(Date.now() + PH_OFFSET_MS).toISOString().slice(0, 10);
    const start = new Date(`${dateKey}T00:00:00.000+08:00`);
    const end = new Date(`${dateKey}T23:59:59.999+08:00`);
    return { start, end, dateKey };
}

function clipSecondsToRange(occurredAt: Date, durationSeconds: number, rangeStart: Date, rangeEnd: Date): number {
    const endMs = occurredAt.getTime();
    const durMs = Math.max(1, Math.round(durationSeconds)) * 1000;
    const startMs = endMs - durMs;
    const s = Math.max(startMs, rangeStart.getTime());
    const e = Math.min(endMs, rangeEnd.getTime() + 1);
    if (e <= s) return 0;
    return Math.round((e - s) / 1000);
}

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
    const { start: startOfDay, end: endOfDay, dateKey } = phDayBounds(dateISO);

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
        entry.totalSeconds += clipSecondsToRange(log.occurredAt, log.durationSeconds, startOfDay, endOfDay);
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
        date: dateKey,
        totalSeconds,
        byApp: byApp.sort((a, b) => b.totalSeconds - a.totalSeconds),
    };
};

export const getWeeklySummary = async (deviceId: string, startDateISO?: string) => {
    const startKey = startDateISO
        ? startDateISO
        : new Date(Date.now() + PH_OFFSET_MS).toISOString().slice(0, 10);
    const start = new Date(`${startKey}T00:00:00.000+08:00`);
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
        entry.totalSeconds += clipSecondsToRange(log.occurredAt, log.durationSeconds, start, end);
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
    const start = new Date(`${startDateISO}T00:00:00.000+08:00`);
    const end = new Date(`${endDateISO}T23:59:59.999+08:00`);

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
        entry.totalSeconds += clipSecondsToRange(log.occurredAt, log.durationSeconds, start, end);
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
    const endKey = new Date(Date.now() + PH_OFFSET_MS).toISOString().slice(0, 10);
    const endDate = new Date(`${endKey}T23:59:59.999+08:00`);
    const startDate = new Date(endDate);
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
        const dateKey = new Date(new Date(log.occurredAt).getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
        if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { totalSeconds: 0, sessions: 0 });
        }
        const entry = dateMap.get(dateKey)!;
        // Best-effort: clip to this day window (prevents cross-midnight over-attribution in PH)
        const { start, end } = phDayBounds(dateKey);
        entry.totalSeconds += clipSecondsToRange(log.occurredAt, log.durationSeconds, start, end);
        entry.sessions += 1;
    }

    // Generate series for all days in range (including days with no data)
    const series: Array<{ date: string; totalSeconds: number; totalMinutes: number; sessions: number }> = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dateKey = new Date(currentDate.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
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

    // De-dupe: Android can retry sync before marking local rows as synced.
    // Treat logs as duplicates if same device+app and occurredAt within ±2s and same duration.
    const dupWindowStart = new Date(occurredAt.getTime() - 2_000);
    const dupWindowEnd = new Date(occurredAt.getTime() + 2_000);
    const existing = await prisma.usageLog.findFirst({
        where: {
            deviceId: device.id,
            appId: app.id,
            durationSeconds: durationSeconds,
            occurredAt: { gte: dupWindowStart, lte: dupWindowEnd },
        },
        select: { id: true },
    });
    if (existing) {
        console.log(`[UsageService] Skipping duplicate usage log: device=${device.id}, app=${app.packageName}, duration=${durationSeconds}s, occurredAt=${occurredAt.toISOString()}`);
        return existing;
    }

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

// Aggregated analytics across all devices
export const getAggregatedWeeklySummary = async (requester: Express.UserPayload, startDateISO?: string) => {
    const startKey = startDateISO
        ? startDateISO
        : new Date(Date.now() + PH_OFFSET_MS).toISOString().slice(0, 10);
    const start = new Date(`${startKey}T00:00:00.000+08:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    // Get all devices the requester has access to
    const deviceWhere = requester.role === Role.ADMIN ? {} : { userId: requester.id };
    const devices = await prisma.device.findMany({
        where: deviceWhere,
        select: { id: true },
    });
    const deviceIds = devices.map(d => d.id);

    if (deviceIds.length === 0) {
        return {
            start: start.toISOString(),
            end: end.toISOString(),
            totalSeconds: 0,
            byApp: [],
        };
    }

    // Get all usage logs across all devices
    const logs = await prisma.usageLog.findMany({
        where: {
            deviceId: { in: deviceIds },
            occurredAt: {
                gte: start,
                lte: end,
            },
        },
        include: {
            app: true,
        },
    });

    // Aggregate by app across all devices
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
        entry.totalSeconds += clipSecondsToRange(log.occurredAt, log.durationSeconds, start, end);
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

export const getAggregatedDailySeries = async (requester: Express.UserPayload, days: number) => {
    const endKey = new Date(Date.now() + PH_OFFSET_MS).toISOString().slice(0, 10);
    const endDate = new Date(`${endKey}T23:59:59.999+08:00`);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all devices the requester has access to
    const deviceWhere = requester.role === Role.ADMIN ? {} : { userId: requester.id };
    const devices = await prisma.device.findMany({
        where: deviceWhere,
        select: { id: true },
    });
    const deviceIds = devices.map(d => d.id);

    if (deviceIds.length === 0) {
        // Return empty series for all days
        const series: Array<{ date: string; totalSeconds: number; totalMinutes: number; sessions: number }> = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateKey = new Date(currentDate.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
            series.push({
                date: dateKey,
                totalSeconds: 0,
                totalMinutes: 0,
                sessions: 0,
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return series;
    }

    // Get all usage logs across all devices
    const logs = await prisma.usageLog.findMany({
        where: {
            deviceId: { in: deviceIds },
            occurredAt: {
                gte: startDate,
                lte: endDate,
            },
        },
    });

    // Group by date
    const dateMap = new Map<string, { totalSeconds: number; sessions: number }>();

    for (const log of logs) {
        const dateKey = new Date(new Date(log.occurredAt).getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
        if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { totalSeconds: 0, sessions: 0 });
        }
        const entry = dateMap.get(dateKey)!;
        const { start, end } = phDayBounds(dateKey);
        entry.totalSeconds += clipSecondsToRange(log.occurredAt, log.durationSeconds, start, end);
        entry.sessions += 1;
    }

    // Generate series for all days in range (including days with no data)
    const series: Array<{ date: string; totalSeconds: number; totalMinutes: number; sessions: number }> = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dateKey = new Date(currentDate.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
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

export const getAggregatedCustomRangeSummary = async (
    requester: Express.UserPayload,
    startDateISO: string,
    endDateISO: string
) => {
    const start = new Date(`${startDateISO}T00:00:00.000+08:00`);
    const end = new Date(`${endDateISO}T23:59:59.999+08:00`);

    // Get all devices the requester has access to
    const deviceWhere = requester.role === Role.ADMIN ? {} : { userId: requester.id };
    const devices = await prisma.device.findMany({
        where: deviceWhere,
        select: { id: true },
    });
    const deviceIds = devices.map(d => d.id);

    if (deviceIds.length === 0) {
        return {
            start: start.toISOString(),
            end: end.toISOString(),
            totalSeconds: 0,
            byApp: [],
        };
    }

    // Get all usage logs across all devices
    const logs = await prisma.usageLog.findMany({
        where: {
            deviceId: { in: deviceIds },
            occurredAt: {
                gte: start,
                lte: end,
            },
        },
        include: {
            app: true,
        },
    });

    // Aggregate by app across all devices
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
        entry.totalSeconds += clipSecondsToRange(log.occurredAt, log.durationSeconds, start, end);
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
