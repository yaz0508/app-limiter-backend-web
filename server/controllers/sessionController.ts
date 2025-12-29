import { Request, Response } from "express";
import { getDeviceForRequester } from "../services/deviceService";
import {
  createSession,
  deleteSession,
  getActiveSessionForDevice,
  getSessionById,
  listSessionsForDevice,
  startActiveSessionForDevice,
  stopActiveSessionForDevice,
  updateSession,
} from "../services/sessionService";

export const listForDevice = async (req: Request, res: Response) => {
  try {
    const device = await getDeviceForRequester(req.params.deviceId, req.user!);
    if (!device) return res.status(404).json({ message: "Device not found" });
    const sessions = await listSessionsForDevice(device.id);
    res.json({ sessions });
  } catch (err) {
    if ((err as Error).message === "Forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }
    throw err;
  }
};

export const create = async (req: Request, res: Response) => {
  const { deviceId, name, durationMinutes, apps } = req.body;
  try {
    const device = await getDeviceForRequester(deviceId, req.user!);
    if (!device) return res.status(404).json({ message: "Device not found" });
    const session = await createSession({
      deviceId: device.id,
      name,
      durationMinutes,
      apps,
    });
    res.status(201).json({ session });
  } catch (err) {
    if ((err as Error).message === "Forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }
    throw err;
  }
};

export const update = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await getSessionById(id);
    if (!existing) return res.status(404).json({ message: "Session not found" });
    // Check device ownership
    const device = await getDeviceForRequester(existing.deviceId, req.user!);
    if (!device) return res.status(404).json({ message: "Device not found" });

    const session = await updateSession(id, req.body);
    res.json({ session });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Forbidden") return res.status(403).json({ message: "Forbidden" });
    throw err;
  }
};

export const remove = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await getSessionById(id);
    if (!existing) return res.status(404).json({ message: "Session not found" });
    const device = await getDeviceForRequester(existing.deviceId, req.user!);
    if (!device) return res.status(404).json({ message: "Device not found" });

    await deleteSession(id);
    res.status(204).send();
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Forbidden") return res.status(403).json({ message: "Forbidden" });
    throw err;
  }
};

export const getActive = async (req: Request, res: Response) => {
  try {
    const device = await getDeviceForRequester(req.params.deviceId, req.user!);
    if (!device) return res.status(404).json({ message: "Device not found" });
    const active = await getActiveSessionForDevice(device.id);
    res.json({ active });
  } catch (err) {
    if ((err as Error).message === "Forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }
    throw err;
  }
};

export const start = async (req: Request, res: Response) => {
  const { deviceId } = req.params;
  const { sessionId } = req.body;
  try {
    const device = await getDeviceForRequester(deviceId, req.user!);
    if (!device) return res.status(404).json({ message: "Device not found" });

    const active = await startActiveSessionForDevice(device.id, sessionId);
    res.json({ active });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Forbidden") return res.status(403).json({ message: "Forbidden" });
    if (msg === "NotFound") return res.status(404).json({ message: "Session not found" });
    throw err;
  }
};

export const stop = async (req: Request, res: Response) => {
  const { deviceId } = req.params;
  try {
    const device = await getDeviceForRequester(deviceId, req.user!);
    if (!device) return res.status(404).json({ message: "Device not found" });
    await stopActiveSessionForDevice(device.id);
    res.status(204).send();
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Forbidden") return res.status(403).json({ message: "Forbidden" });
    throw err;
  }
};


