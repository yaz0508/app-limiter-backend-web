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

export const getDailySummary = async (deviceId: string, dateISO?: string) => {
  const target = dateISO ? new Date(dateISO) : new Date();
  const start = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);

  const aggregates = await aggregateUsage(deviceId, { start, end });
  const totalSeconds = aggregates.reduce((acc, a) => acc + (a.totalSeconds ?? 0), 0);
  return { date: start.toISOString(), totalSeconds, byApp: aggregates };
};

export const getWeeklySummary = async (
  deviceId: string,
  startDateISO?: string
) => {
  const start = startDateISO ? new Date(startDateISO) : new Date();
  // Align to start of day
  const normalized = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  );
  const end = new Date(normalized);
  end.setUTCDate(end.getUTCDate() + 7);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);

  const aggregates = await aggregateUsage(deviceId, {
    start: normalized,
    end,
  });
  const totalSeconds = aggregates.reduce((acc, a) => acc + (a.totalSeconds ?? 0), 0);
  return {
    start: normalized.toISOString(),
    end: end.toISOString(),
    totalSeconds,
    byApp: aggregates,
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


