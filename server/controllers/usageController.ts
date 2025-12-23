import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import {
  ensureDeviceAccess,
  getCustomRangeSummary,
  getDailySummary,
  getWeeklySummary,
  ingestUsageLog,
} from "../services/usageService";

export const ingest = async (req: Request, res: Response) => {
  try {
    const log = await ingestUsageLog(req.body);
    res.status(201).json({ log });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "DeviceNotRegistered") {
      return res.status(400).json({ message: "Device not registered" });
    }
    throw err;
  }
};

export const dailySummary = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { date } = req.query as { date?: string };
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return res.status(404).json({ message: "Device not found" });
    ensureDeviceAccess(device.userId, req.user!);

    const summary = await getDailySummary(deviceId, date);
    console.log(`[UsageController] Daily summary for device ${deviceId}:`, {
      date: summary.date,
      totalSeconds: summary.totalSeconds,
      appCount: summary.byApp.length,
    });
    res.json(summary);
  } catch (error) {
    console.error("[UsageController] Error in dailySummary:", error);
    res.status(500).json({ message: "Failed to get daily summary" });
  }
};

export const weeklySummary = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { start } = req.query as { start?: string };
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return res.status(404).json({ message: "Device not found" });
    ensureDeviceAccess(device.userId, req.user!);

    const summary = await getWeeklySummary(deviceId, start);
    console.log(`[UsageController] Weekly summary for device ${deviceId}:`, {
      start: summary.start,
      end: summary.end,
      totalSeconds: summary.totalSeconds,
      appCount: summary.byApp.length,
    });
    res.json(summary);
  } catch (error) {
    console.error("[UsageController] Error in weeklySummary:", error);
    res.status(500).json({ message: "Failed to get weekly summary" });
  }
};

export const customRangeSummary = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { start, end } = req.query as { start?: string; end?: string };
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return res.status(404).json({ message: "Device not found" });
    ensureDeviceAccess(device.userId, req.user!);

    if (!start || !end) {
      return res.status(400).json({ message: "Both start and end dates are required" });
    }

    const summary = await getCustomRangeSummary(deviceId, start, end);
    console.log(`[UsageController] Custom range summary for device ${deviceId}:`, {
      start: summary.start,
      end: summary.end,
      totalSeconds: summary.totalSeconds,
      appCount: summary.byApp.length,
    });
    res.json(summary);
  } catch (error) {
    console.error("[UsageController] Error in customRangeSummary:", error);
    res.status(500).json({ message: "Failed to get custom range summary" });
  }
};


