import { Request, Response } from "express";
import { findDeviceByIdentifier } from "../services/deviceService";
import {
  getActiveSessionForDevice,
  listSessionsForDevice,
  startActiveSessionForDevice,
  stopActiveSessionForDevice,
  createSession,
  pauseActiveSessionForDevice,
  resumeActiveSessionForDevice,
} from "../services/sessionService";

const ensureAccessIfJwtPresent = (deviceUserId: string, user?: Express.UserPayload) => {
  if (!user) return;
  if (user.role === "ADMIN") return;
  if (user.id !== deviceUserId) throw new Error("Forbidden");
};

export const listForDeviceIdentifier = async (req: Request, res: Response) => {
  try {
    const deviceIdentifier = req.params.deviceIdentifier;
    const device = await findDeviceByIdentifier(deviceIdentifier);
    if (!device) return res.status(400).json({ message: "Device not registered" });

    ensureAccessIfJwtPresent(device.userId, req.user);

    const sessions = await listSessionsForDevice(device.id);
    res.json({ sessions });
  } catch (err) {
    if ((err as Error).message === "Forbidden") return res.status(403).json({ message: "Forbidden" });
    throw err;
  }
};

export const getActiveForDeviceIdentifier = async (req: Request, res: Response) => {
  try {
    const deviceIdentifier = req.params.deviceIdentifier;
    const device = await findDeviceByIdentifier(deviceIdentifier);
    if (!device) return res.status(400).json({ message: "Device not registered" });

    ensureAccessIfJwtPresent(device.userId, req.user);

    const active = await getActiveSessionForDevice(device.id);
    res.json({ active });
  } catch (err) {
    if ((err as Error).message === "Forbidden") return res.status(403).json({ message: "Forbidden" });
    throw err;
  }
};

export const startForDeviceIdentifier = async (req: Request, res: Response) => {
  const { sessionId } = req.body as { sessionId: string };
  try {
    const deviceIdentifier = req.params.deviceIdentifier;
    const device = await findDeviceByIdentifier(deviceIdentifier);
    if (!device) return res.status(400).json({ message: "Device not registered" });

    ensureAccessIfJwtPresent(device.userId, req.user);

    const active = await startActiveSessionForDevice(device.id, sessionId);
    res.json({ active });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Forbidden") return res.status(403).json({ message: "Forbidden" });
    if (msg === "NotFound") return res.status(404).json({ message: "Session not found" });
    throw err;
  }
};

export const stopForDeviceIdentifier = async (req: Request, res: Response) => {
  try {
    const deviceIdentifier = req.params.deviceIdentifier;
    const device = await findDeviceByIdentifier(deviceIdentifier);
    if (!device) return res.status(400).json({ message: "Device not registered" });

    ensureAccessIfJwtPresent(device.userId, req.user);

    await stopActiveSessionForDevice(device.id);
    res.status(204).send();
  } catch (err) {
    if ((err as Error).message === "Forbidden") return res.status(403).json({ message: "Forbidden" });
    throw err;
  }
};

export const createForDeviceIdentifier = async (req: Request, res: Response) => {
  const { name, durationMinutes, apps } = req.body as {
    name: string;
    durationMinutes: number;
    apps: Array<{ packageName: string; appName?: string }>;
  };
  try {
    const deviceIdentifier = req.params.deviceIdentifier;
    const device = await findDeviceByIdentifier(deviceIdentifier);
    if (!device) return res.status(400).json({ message: "Device not registered" });

    ensureAccessIfJwtPresent(device.userId, req.user);

    const session = await createSession({
      deviceId: device.id,
      name,
      durationMinutes,
      apps,
    });
    res.status(201).json({ session });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Forbidden") return res.status(403).json({ message: "Forbidden" });
    throw err;
  }
};

export const pauseForDeviceIdentifier = async (req: Request, res: Response) => {
  try {
    const deviceIdentifier = req.params.deviceIdentifier;
    const device = await findDeviceByIdentifier(deviceIdentifier);
    if (!device) return res.status(400).json({ message: "Device not registered" });

    ensureAccessIfJwtPresent(device.userId, req.user);

    const active = await pauseActiveSessionForDevice(device.id);
    if (!active) return res.status(404).json({ message: "No active session found" });
    res.json({ active });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Forbidden") return res.status(403).json({ message: "Forbidden" });
    throw err;
  }
};

export const resumeForDeviceIdentifier = async (req: Request, res: Response) => {
  try {
    const deviceIdentifier = req.params.deviceIdentifier;
    const device = await findDeviceByIdentifier(deviceIdentifier);
    if (!device) return res.status(400).json({ message: "Device not registered" });

    ensureAccessIfJwtPresent(device.userId, req.user);

    const active = await resumeActiveSessionForDevice(device.id);
    if (!active) return res.status(404).json({ message: "No active session found" });
    res.json({ active });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Forbidden") return res.status(403).json({ message: "Forbidden" });
    throw err;
  }
};


