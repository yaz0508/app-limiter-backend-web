import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import {
  getDailyAnalyticsSummary,
  getWeeklyAnalyticsSummary,
  getMonthlyAnalyticsSummary,
  getTopAppsSummary,
  getBlockEventsSummary,
  syncAnalyticsData,
} from "../services/analyticsService";
import { ensureDeviceAccess } from "../services/usageService";

export const syncAnalytics = async (req: Request, res: Response) => {
  try {
    const { deviceIdentifier, summaries, blockEvents } = req.body;
    await syncAnalyticsData(deviceIdentifier, summaries, blockEvents);
    res.json({ success: true });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "DeviceNotRegistered") {
      return res.status(400).json({ message: "Device not registered" });
    }
    console.error("[AnalyticsController] Error syncing analytics:", err);
    res.status(500).json({ message: "Failed to sync analytics" });
  }
};

export const getDailyAnalytics = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return res.status(404).json({ message: "Device not found" });
    ensureDeviceAccess(device.userId, req.user!);

    const summary = await getDailyAnalyticsSummary(deviceId);
    res.json(summary);
  } catch (error) {
    console.error("[AnalyticsController] Error in getDailyAnalytics:", error);
    res.status(500).json({ message: "Failed to get daily analytics" });
  }
};

export const getWeeklyAnalytics = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return res.status(404).json({ message: "Device not found" });
    ensureDeviceAccess(device.userId, req.user!);

    const summary = await getWeeklyAnalyticsSummary(deviceId);
    res.json(summary);
  } catch (error) {
    console.error("[AnalyticsController] Error in getWeeklyAnalytics:", error);
    res.status(500).json({ message: "Failed to get weekly analytics" });
  }
};

export const getMonthlyAnalytics = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return res.status(404).json({ message: "Device not found" });
    ensureDeviceAccess(device.userId, req.user!);

    const summary = await getMonthlyAnalyticsSummary(deviceId);
    res.json(summary);
  } catch (error) {
    console.error("[AnalyticsController] Error in getMonthlyAnalytics:", error);
    res.status(500).json({ message: "Failed to get monthly analytics" });
  }
};

export const getTopApps = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { period = "weekly", limit = "5" } = req.query;
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return res.status(404).json({ message: "Device not found" });
    ensureDeviceAccess(device.userId, req.user!);

    const topApps = await getTopAppsSummary(deviceId, period as string, parseInt(limit as string));
    res.json({ topApps });
  } catch (error) {
    console.error("[AnalyticsController] Error in getTopApps:", error);
    res.status(500).json({ message: "Failed to get top apps" });
  }
};

export const getBlockEvents = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { limit = "50" } = req.query;
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return res.status(404).json({ message: "Device not found" });
    ensureDeviceAccess(device.userId, req.user!);

    const events = await getBlockEventsSummary(deviceId, parseInt(limit as string));
    res.json({ events });
  } catch (error) {
    console.error("[AnalyticsController] Error in getBlockEvents:", error);
    res.status(500).json({ message: "Failed to get block events" });
  }
};
