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
  const { deviceId } = req.params;
  const { date } = req.query as { date?: string };
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) return res.status(404).json({ message: "Device not found" });
  ensureDeviceAccess(device.userId, req.user!);

  const summary = await getDailySummary(deviceId, date);
  res.json(summary);
};

export const weeklySummary = async (req: Request, res: Response) => {
  const { deviceId } = req.params;
  const { start } = req.query as { start?: string };
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) return res.status(404).json({ message: "Device not found" });
  ensureDeviceAccess(device.userId, req.user!);

  const summary = await getWeeklySummary(deviceId, start);
  res.json(summary);
};

export const customRangeSummary = async (req: Request, res: Response) => {
  const { deviceId } = req.params;
  const { start, end } = req.query as { start?: string; end?: string };
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) return res.status(404).json({ message: "Device not found" });
  ensureDeviceAccess(device.userId, req.user!);

  if (!start || !end) {
    return res.status(400).json({ message: "Both start and end dates are required" });
  }

  const summary = await getCustomRangeSummary(deviceId, start, end);
  res.json(summary);
};


