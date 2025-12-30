import { Role } from "@prisma/client";
import { prisma } from "../prisma/client";

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
    byApp: [],
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
    byApp: [],
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
    byApp: [],
  };
};
