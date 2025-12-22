import { Request, Response } from "express";
import { findOrCreateApp, listApps, getAppsUsedOnDevice } from "../services/appService";
import { getDeviceForRequester } from "../services/deviceService";

export const list = async (_req: Request, res: Response) => {
  const apps = await listApps();
  res.json({ apps });
};

export const create = async (req: Request, res: Response) => {
  const { packageName, name } = req.body;
  const app = await findOrCreateApp(packageName, name);
  res.status(201).json({ app });
};

export const getDeviceApps = async (req: Request, res: Response) => {
  try {
    const device = await getDeviceForRequester(req.params.deviceId, req.user!);
    if (!device) return res.status(404).json({ message: "Device not found" });

    const apps = await getAppsUsedOnDevice(device.id);
    res.json({ apps });
  } catch (err) {
    if ((err as Error).message === "Forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }
    throw err;
  }
};


