import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { ensureDeviceAccess } from "../services/usageService";
import { getHourlyUsage, getDailyHourlyUsage, getPeakUsageHours } from "../services/hourlyUsageService";

export const hourly = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { date } = req.query as { date?: string };
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    ensureDeviceAccess(device.userId, req.user!);

    const dateISO = date || new Date().toISOString().split('T')[0];
    const hourly = await getHourlyUsage(deviceId, dateISO);
    res.json({ date: dateISO, hourly });
  } catch (error) {
    console.error("[HourlyUsageController] Error getting hourly usage:", error);
    res.status(500).json({ message: "Failed to get hourly usage" });
  }
};

export const dailyHourly = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { start, end } = req.query as { start?: string; end?: string };
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    ensureDeviceAccess(device.userId, req.user!);

    if (!start || !end) {
      return res.status(400).json({ message: "Both start and end dates are required" });
    }

    const dailyHourly = await getDailyHourlyUsage(deviceId, start, end);
    res.json({ dailyHourly });
  } catch (error) {
    console.error("[HourlyUsageController] Error getting daily hourly usage:", error);
    res.status(500).json({ message: "Failed to get daily hourly usage" });
  }
};

export const peakHours = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { days } = req.query as { days?: string };
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    ensureDeviceAccess(device.userId, req.user!);

    const parsedDays = days ? parseInt(days, 10) : 7;
    const safeDays = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 7;
    
    const peakHours = await getPeakUsageHours(deviceId, safeDays);
    res.json({ peakHours });
  } catch (error) {
    console.error("[HourlyUsageController] Error getting peak hours:", error);
    res.status(500).json({ message: "Failed to get peak hours" });
  }
};


