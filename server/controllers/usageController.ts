import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import {
  ensureDeviceAccess,
  getCustomRangeSummary,
  getDailySeries,
  getDailySummary,
  getWeeklySummary,
  ingestUsageLog,
  getAggregatedWeeklySummary,
  getAggregatedDailySeries,
  getAggregatedCustomRangeSummary,
} from "../services/usageService";

export const ingest = async (req: Request, res: Response) => {
  try {
    console.log(`[UsageController] Ingesting usage log:`, {
      deviceIdentifier: req.body.deviceIdentifier,
      appPackage: req.body.appPackage,
      durationSeconds: req.body.durationSeconds,
      occurredAt: req.body.occurredAt,
      authenticated: !!req.user
    });

    const log = await ingestUsageLog(req.body);
    console.log(`[UsageController] Successfully ingested usage log: id=${log.id}`);
    res.status(201).json({ log });
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[UsageController] Error ingesting usage log:`, err);
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

export const dailySeries = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { days } = req.query as { days?: string };
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return res.status(404).json({ message: "Device not found" });
    ensureDeviceAccess(device.userId, req.user!);

    const parsedDays = days ? Number(days) : 30;
    const safeDays = Number.isFinite(parsedDays)
      ? Math.min(365, Math.max(7, Math.floor(parsedDays)))
      : 30;

    const series = await getDailySeries(deviceId, safeDays);
    res.json({ deviceId, days: safeDays, series });
  } catch (error) {
    console.error("[UsageController] Error in dailySeries:", error);
    res.status(500).json({ message: "Failed to get daily series" });
  }
};

// Aggregated analytics controllers
export const aggregatedWeeklySummary = async (req: Request, res: Response) => {
  try {
    const { start } = req.query as { start?: string };
    const summary = await getAggregatedWeeklySummary(req.user!, start);
    console.log(`[UsageController] Aggregated weekly summary:`, {
      start: summary.start,
      end: summary.end,
      totalSeconds: summary.totalSeconds,
      appCount: summary.byApp.length,
    });
    res.json(summary);
  } catch (error) {
    console.error("[UsageController] Error in aggregatedWeeklySummary:", error);
    res.status(500).json({ message: "Failed to get aggregated weekly summary" });
  }
};

export const aggregatedDailySeries = async (req: Request, res: Response) => {
  try {
    const { days } = req.query as { days?: string };
    const parsedDays = days ? Number(days) : 30;
    const safeDays = Number.isFinite(parsedDays)
      ? Math.min(365, Math.max(7, Math.floor(parsedDays)))
      : 30;

    const series = await getAggregatedDailySeries(req.user!, safeDays);
    res.json({ days: safeDays, series });
  } catch (error) {
    console.error("[UsageController] Error in aggregatedDailySeries:", error);
    res.status(500).json({ message: "Failed to get aggregated daily series" });
  }
};

export const aggregatedCustomRangeSummary = async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query as { start?: string; end?: string };
    if (!start || !end) {
      return res.status(400).json({ message: "Both start and end dates are required" });
    }

    const summary = await getAggregatedCustomRangeSummary(req.user!, start, end);
    console.log(`[UsageController] Aggregated custom range summary:`, {
      start: summary.start,
      end: summary.end,
      totalSeconds: summary.totalSeconds,
      appCount: summary.byApp.length,
    });
    res.json(summary);
  } catch (error) {
    console.error("[UsageController] Error in aggregatedCustomRangeSummary:", error);
    res.status(500).json({ message: "Failed to get aggregated custom range summary" });
  }
};


