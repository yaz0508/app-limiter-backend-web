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

function normalizePhDateKey(dateISO?: string): string {
    if (dateISO && /^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
        return dateISO;
    }
    return new Date(Date.now() + PH_OFFSET_MS).toISOString().slice(0, 10);
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
    occurredAt?: Date | string;
    eventId?: string;
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

    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
        throw new Error("Invalid occurredAt");
    }

    const eventId = input.eventId?.trim();
    if (eventId) {
        const existingByEvent = await prisma.usageLog.findFirst({
            where: {
                deviceId: device.id,
                eventId,
            },
            select: { id: true },
        });
        if (existingByEvent) {
            console.log(`[UsageService] Skipping duplicate usage log (eventId): device=${device.id}, app=${app.packageName}, eventId=${eventId}`);
            return existingByEvent;
        }
    }

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
            eventId: eventId,
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

    // Get all usage logs across all devices in the date range
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

/**
 * Ingest daily usage snapshot from Android's queryUsageStats()
 * This is the source of truth for daily totals - same as Digital Wellbeing
 */
export const ingestDailyUsageSnapshot = async (input: {
    deviceIdentifier: string;
    date: string; // YYYY-MM-DD in PH timezone
    apps: Array<{
        packageName: string;
        appName?: string;
        totalMinutes: number;
    }>;
}): Promise<{ synced: number; date: string }> => {
    const device = await findDeviceByIdentifier(input.deviceIdentifier);
    if (!device) {
        throw new Error("DeviceNotRegistered");
    }

    const dateKey = normalizePhDateKey(input.date);
    let syncedCount = 0;

    for (const appData of input.apps) {
        const totalMinutes = Math.min(24 * 60, Math.max(0, Math.round(appData.totalMinutes)));
        if (totalMinutes <= 0) continue; // Skip apps with no usage

        const app = await findOrCreateApp(appData.packageName, appData.appName);

        // Upsert the snapshot (update if exists, create if not)
        await prisma.dailyUsageSnapshot.upsert({
            where: {
                deviceId_appId_date: {
                    deviceId: device.id,
                    appId: app.id,
                    date: dateKey,
                },
            },
            update: {
                totalMinutes: totalMinutes,
                syncedAt: new Date(),
            },
            create: {
                deviceId: device.id,
                appId: app.id,
                date: dateKey,
                totalMinutes: totalMinutes,
                source: "queryUsageStats",
            },
        });
        syncedCount++;
    }

    console.log(`[UsageService] Synced ${syncedCount} daily usage snapshot(s) for device ${device.id} on ${dateKey}`);
    return { synced: syncedCount, date: dateKey };
};

/**
 * Get daily summary using accurate snapshots (from queryUsageStats) if available,
 * falling back to session-based calculation if not
 */
export const getDailySummaryAccurate = async (deviceId: string, dateISO?: string) => {
    const { start: startOfDay, end: endOfDay, dateKey } = phDayBounds(dateISO);

    // First, try to get snapshots (accurate data from queryUsageStats)
    const snapshots = await prisma.dailyUsageSnapshot.findMany({
        where: {
            deviceId,
            date: dateKey,
        },
        include: {
            app: true,
        },
    });

    if (snapshots.length > 0) {
        // Use accurate snapshot data
        const byApp = snapshots.map(snapshot => ({
            appId: snapshot.appId,
            appName: snapshot.app.name,
            packageName: snapshot.app.packageName,
            totalMinutes: snapshot.totalMinutes,
            totalSeconds: snapshot.totalMinutes * 60,
            sessions: 0, // Sessions not tracked in snapshots
            source: "queryUsageStats" as const,
        }));

        const totalSeconds = byApp.reduce((sum, app) => sum + app.totalSeconds, 0);

        return {
            date: dateKey,
            totalSeconds,
            byApp: byApp.sort((a, b) => b.totalSeconds - a.totalSeconds),
            source: "queryUsageStats", // Indicate data source
        };
    }

    // Fallback to session-based calculation
    const sessionBased = await getDailySummary(deviceId, dateISO);
    return {
        ...sessionBased,
        source: "sessions", // Indicate data source
    };
};

/**
 * Get weekly summary using accurate snapshots (from queryUsageStats) if available,
 * falling back to session-based calculation if not
 */
export const getWeeklySummaryAccurate = async (deviceId: string, startDateISO?: string) => {
    const startKey = startDateISO
        ? startDateISO
        : new Date(Date.now() + PH_OFFSET_MS).toISOString().slice(0, 10);
    const start = new Date(`${startKey}T00:00:00.000+08:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    // Generate all date keys in the range
    const dateKeys: string[] = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
        const dateKey = new Date(currentDate.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
        dateKeys.push(dateKey);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get all snapshots for this device in the date range
    const snapshots = await prisma.dailyUsageSnapshot.findMany({
        where: {
            deviceId,
            date: { in: dateKeys },
        },
        include: {
            app: true,
        },
    });

    if (snapshots.length > 0) {
        // Use accurate snapshot data - aggregate by app across all days
        const appMap = new Map<string, { appId: string; appName: string; packageName: string; totalMinutes: number }>();

        for (const snapshot of snapshots) {
            const key = snapshot.appId;
            if (!appMap.has(key)) {
                appMap.set(key, {
                    appId: snapshot.appId,
                    appName: snapshot.app.name,
                    packageName: snapshot.app.packageName,
                    totalMinutes: 0,
                });
            }
            const entry = appMap.get(key)!;
            entry.totalMinutes += snapshot.totalMinutes;
        }

        const byApp = Array.from(appMap.values()).map(entry => ({
            appId: entry.appId,
            appName: entry.appName,
            packageName: entry.packageName,
            totalMinutes: entry.totalMinutes,
            totalSeconds: entry.totalMinutes * 60,
            sessions: 0, // Sessions not tracked in snapshots
            source: "queryUsageStats" as const,
        }));

        const totalSeconds = byApp.reduce((sum, app) => sum + app.totalSeconds, 0);

        return {
            start: start.toISOString(),
            end: end.toISOString(),
            totalSeconds,
            byApp: byApp.sort((a, b) => b.totalSeconds - a.totalSeconds),
            source: "queryUsageStats",
        };
    }

    // Fallback to session-based calculation
    const sessionBased = await getWeeklySummary(deviceId, startDateISO);
    return {
        ...sessionBased,
        source: "sessions",
    };
};

/**
 * Get custom range summary using accurate snapshots (from queryUsageStats) if available,
 * falling back to session-based calculation if not
 */
export const getCustomRangeSummaryAccurate = async (
    deviceId: string,
    startDateISO: string,
    endDateISO: string
) => {
    const start = new Date(`${startDateISO}T00:00:00.000+08:00`);
    const end = new Date(`${endDateISO}T23:59:59.999+08:00`);

    // Generate all date keys in the range
    const dateKeys: string[] = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
        const dateKey = new Date(currentDate.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
        dateKeys.push(dateKey);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get all snapshots for this device in the date range
    const snapshots = await prisma.dailyUsageSnapshot.findMany({
        where: {
            deviceId,
            date: { in: dateKeys },
        },
        include: {
            app: true,
        },
    });

    if (snapshots.length > 0) {
        // Use accurate snapshot data - aggregate by app across all days
        const appMap = new Map<string, { appId: string; appName: string; packageName: string; totalMinutes: number }>();

        for (const snapshot of snapshots) {
            const key = snapshot.appId;
            if (!appMap.has(key)) {
                appMap.set(key, {
                    appId: snapshot.appId,
                    appName: snapshot.app.name,
                    packageName: snapshot.app.packageName,
                    totalMinutes: 0,
                });
            }
            const entry = appMap.get(key)!;
            entry.totalMinutes += snapshot.totalMinutes;
        }

        const byApp = Array.from(appMap.values()).map(entry => ({
            appId: entry.appId,
            appName: entry.appName,
            packageName: entry.packageName,
            totalMinutes: entry.totalMinutes,
            totalSeconds: entry.totalMinutes * 60,
            sessions: 0, // Sessions not tracked in snapshots
            source: "queryUsageStats" as const,
        }));

        const totalSeconds = byApp.reduce((sum, app) => sum + app.totalSeconds, 0);

        return {
            start: start.toISOString(),
            end: end.toISOString(),
            totalSeconds,
            byApp: byApp.sort((a, b) => b.totalSeconds - a.totalSeconds),
            source: "queryUsageStats",
        };
    }

    // Fallback to session-based calculation
    const sessionBased = await getCustomRangeSummary(deviceId, startDateISO, endDateISO);
    return {
        ...sessionBased,
        source: "sessions",
    };
};

/**
 * Get daily series using accurate snapshots (from queryUsageStats) if available,
 * falling back to session-based calculation if not
 */
export const getDailySeriesAccurate = async (deviceId: string, days: number) => {
    const endKey = new Date(Date.now() + PH_OFFSET_MS).toISOString().slice(0, 10);
    const endDate = new Date(`${endKey}T23:59:59.999+08:00`);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Generate all date keys in the range
    const dateKeys: string[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateKey = new Date(currentDate.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
        dateKeys.push(dateKey);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get all snapshots for this device in the date range
    const snapshots = await prisma.dailyUsageSnapshot.findMany({
        where: {
            deviceId,
            date: { in: dateKeys },
        },
    });

    // Group by date
    const dateMap = new Map<string, { totalMinutes: number }>();

    for (const snapshot of snapshots) {
        const dateKey = snapshot.date;
        if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { totalMinutes: 0 });
        }
        const entry = dateMap.get(dateKey)!;
        entry.totalMinutes += snapshot.totalMinutes;
    }

    // Generate series for all days in range (including days with no data)
    const series: Array<{ date: string; totalSeconds: number; totalMinutes: number; sessions: number }> = [];
    const currentDate2 = new Date(startDate);

    while (currentDate2 <= endDate) {
        const dateKey = new Date(currentDate2.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
        const entry = dateMap.get(dateKey) || { totalMinutes: 0 };

        series.push({
            date: dateKey,
            totalSeconds: entry.totalMinutes * 60,
            totalMinutes: entry.totalMinutes,
            sessions: 0, // Sessions not tracked in snapshots
        });

        currentDate2.setDate(currentDate2.getDate() + 1);
    }

    return series;
};

/**
 * Get aggregated weekly summary using accurate snapshots (from queryUsageStats) if available,
 * falling back to session-based calculation if not
 */
export const getAggregatedWeeklySummaryAccurate = async (requester: Express.UserPayload, startDateISO?: string) => {
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

    // Generate all date keys in the range
    const dateKeys: string[] = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
        const dateKey = new Date(currentDate.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
        dateKeys.push(dateKey);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get all snapshots across all devices in the date range
    const snapshots = await prisma.dailyUsageSnapshot.findMany({
        where: {
            deviceId: { in: deviceIds },
            date: { in: dateKeys },
        },
        include: {
            app: true,
        },
    });

    if (snapshots.length > 0) {
        // Aggregate by app across all devices
        const appMap = new Map<string, { appId: string; appName: string; packageName: string; totalMinutes: number }>();

        for (const snapshot of snapshots) {
            const key = snapshot.appId;
            if (!appMap.has(key)) {
                appMap.set(key, {
                    appId: snapshot.appId,
                    appName: snapshot.app.name,
                    packageName: snapshot.app.packageName,
                    totalMinutes: 0,
                });
            }
            const entry = appMap.get(key)!;
            entry.totalMinutes += snapshot.totalMinutes;
        }

        const byApp = Array.from(appMap.values()).map(entry => ({
            appId: entry.appId,
            appName: entry.appName,
            packageName: entry.packageName,
            totalMinutes: entry.totalMinutes,
            totalSeconds: entry.totalMinutes * 60,
            sessions: 0, // Sessions not tracked in snapshots
            source: "queryUsageStats" as const,
        }));

        const totalSeconds = byApp.reduce((sum, app) => sum + app.totalSeconds, 0);

        return {
            start: start.toISOString(),
            end: end.toISOString(),
            totalSeconds,
            byApp: byApp.sort((a, b) => b.totalSeconds - a.totalSeconds),
            source: "queryUsageStats",
        };
    }

    // Fallback to session-based calculation
    const sessionBased = await getAggregatedWeeklySummary(requester, startDateISO);
    return {
        ...sessionBased,
        source: "sessions",
    };
};

/**
 * Get aggregated custom range summary using accurate snapshots (from queryUsageStats) if available,
 * falling back to session-based calculation if not
 */
export const getAggregatedCustomRangeSummaryAccurate = async (
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

    // Generate all date keys in the range
    const dateKeys: string[] = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
        const dateKey = new Date(currentDate.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
        dateKeys.push(dateKey);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get all snapshots across all devices in the date range
    const snapshots = await prisma.dailyUsageSnapshot.findMany({
        where: {
            deviceId: { in: deviceIds },
            date: { in: dateKeys },
        },
        include: {
            app: true,
        },
    });

    if (snapshots.length > 0) {
        // Aggregate by app across all devices
        const appMap = new Map<string, { appId: string; appName: string; packageName: string; totalMinutes: number }>();

        for (const snapshot of snapshots) {
            const key = snapshot.appId;
            if (!appMap.has(key)) {
                appMap.set(key, {
                    appId: snapshot.appId,
                    appName: snapshot.app.name,
                    packageName: snapshot.app.packageName,
                    totalMinutes: 0,
                });
            }
            const entry = appMap.get(key)!;
            entry.totalMinutes += snapshot.totalMinutes;
        }

        const byApp = Array.from(appMap.values()).map(entry => ({
            appId: entry.appId,
            appName: entry.appName,
            packageName: entry.packageName,
            totalMinutes: entry.totalMinutes,
            totalSeconds: entry.totalMinutes * 60,
            sessions: 0, // Sessions not tracked in snapshots
            source: "queryUsageStats" as const,
        }));

        const totalSeconds = byApp.reduce((sum, app) => sum + app.totalSeconds, 0);

        return {
            start: start.toISOString(),
            end: end.toISOString(),
            totalSeconds,
            byApp: byApp.sort((a, b) => b.totalSeconds - a.totalSeconds),
            source: "queryUsageStats",
        };
    }

    // Fallback to session-based calculation
    const sessionBased = await getAggregatedCustomRangeSummary(requester, startDateISO, endDateISO);
    return {
        ...sessionBased,
        source: "sessions",
    };
};

/**
 * Get aggregated daily series using accurate snapshots (from queryUsageStats) if available,
 * falling back to session-based calculation if not
 */
export const getAggregatedDailySeriesAccurate = async (requester: Express.UserPayload, days: number) => {
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
        return [];
    }

    // Generate all date keys in the range
    const dateKeys: string[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateKey = new Date(currentDate.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
        dateKeys.push(dateKey);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get all snapshots across all devices in the date range
    const snapshots = await prisma.dailyUsageSnapshot.findMany({
        where: {
            deviceId: { in: deviceIds },
            date: { in: dateKeys },
        },
    });

    // Group by date
    const dateMap = new Map<string, { totalMinutes: number }>();

    for (const snapshot of snapshots) {
        const dateKey = snapshot.date;
        if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { totalMinutes: 0 });
        }
        const entry = dateMap.get(dateKey)!;
        entry.totalMinutes += snapshot.totalMinutes;
    }

    // Generate series for all days in range (including days with no data)
    const series: Array<{ date: string; totalSeconds: number; totalMinutes: number; sessions: number }> = [];
    const currentDate2 = new Date(startDate);

    while (currentDate2 <= endDate) {
        const dateKey = new Date(currentDate2.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
        const entry = dateMap.get(dateKey) || { totalMinutes: 0 };

        series.push({
            date: dateKey,
            totalSeconds: entry.totalMinutes * 60,
            totalMinutes: entry.totalMinutes,
            sessions: 0, // Sessions not tracked in snapshots
        });

        currentDate2.setDate(currentDate2.getDate() + 1);
    }

    return series;
};
