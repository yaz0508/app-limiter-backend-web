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
    // Return empty summary structure
    return {
        date: dateISO || new Date().toISOString(),
        totalSeconds: 0,
        byApp: [] as Array<{ appId: string; totalMinutes: number; packageName: string; [key: string]: any }>,
    };
};

export const getWeeklySummary = async (deviceId: string, startDateISO?: string) => {
    const start = startDateISO ? new Date(startDateISO) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return {
        start: start.toISOString(),
        end: end.toISOString(),
        totalSeconds: 0,
        byApp: [] as Array<{ appId: string; totalMinutes: number; packageName: string;[key: string]: any }>,
    };
};

export const getCustomRangeSummary = async (
    deviceId: string,
    startDateISO: string,
    endDateISO: string
) => {
    return {
        start: startDateISO,
        end: endDateISO,
        totalSeconds: 0,
        byApp: [] as Array<{ appId: string; totalMinutes: number; packageName: string;[key: string]: any }>,
    };
};

export const getDailySeries = async (deviceId: string, days: number) => {
    return [] as Array<{ date: string; totalSeconds: number; totalMinutes: number; sessions: number }>;
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
