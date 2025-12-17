import { Request, Response } from "express";
import { findOrCreateApp } from "../services/appService";
import { getDeviceForRequester } from "../services/deviceService";
import { deleteLimit, listLimitsForDevice, upsertLimit } from "../services/limitService";

export const list = async (req: Request, res: Response) => {
  try {
    const device = await getDeviceForRequester(req.params.deviceId, req.user!);
    if (!device) return res.status(404).json({ message: "Device not found" });
    const limits = await listLimitsForDevice(device.id);
    res.json({ limits });
  } catch (err) {
    if ((err as Error).message === "Forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }
    throw err;
  }
};

export const upsert = async (req: Request, res: Response) => {
  const { deviceId, appPackage, appName, dailyLimitMinutes } = req.body;
  try {
    const device = await getDeviceForRequester(deviceId, req.user!);
    if (!device) return res.status(404).json({ message: "Device not found" });

    const app = await findOrCreateApp(appPackage, appName);
    const limit = await upsertLimit({
      deviceId: device.id,
      appId: app.id,
      dailyLimitMinutes,
      createdById: req.user!.id,
    });
    res.status(201).json({ limit });
  } catch (err) {
    if ((err as Error).message === "Forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }
    throw err;
  }
};

export const remove = async (req: Request, res: Response) => {
  const { deviceId, appId } = req.params;
  try {
    const device = await getDeviceForRequester(deviceId, req.user!);
    if (!device) return res.status(404).json({ message: "Device not found" });
    await deleteLimit(deviceId, appId);
    res.status(204).send();
  } catch (err) {
    if ((err as Error).message === "Forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }
    throw err;
  }
};


