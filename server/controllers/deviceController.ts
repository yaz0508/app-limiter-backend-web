import { Request, Response } from "express";
import {
  createDevice,
  deleteDevice,
  getDeviceForRequester,
  listDevicesForRequester,
  updateDevice,
} from "../services/deviceService";

export const list = async (req: Request, res: Response) => {
  const devices = await listDevicesForRequester(req.user!);
  res.json({ devices });
};

export const get = async (req: Request, res: Response) => {
  try {
    const device = await getDeviceForRequester(req.params.id, req.user!);
    if (!device) return res.status(404).json({ message: "Device not found" });
    res.json({ device });
  } catch (err) {
    if ((err as Error).message === "Forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }
    throw err;
  }
};

export const create = async (req: Request, res: Response) => {
  const { name, os, deviceIdentifier, userId } = req.body;
  try {
    const device = await createDevice(
      { name, os, deviceIdentifier, userId },
      req.user!
    );
    // 201 if created, 200 if it already existed (idempotent behavior).
    // We can’t trivially distinguish without extra queries; treat as success.
    res.status(200).json({ device });
  } catch (err) {
    if ((err as Error).message === "DeviceIdentifierInUse") {
      return res.status(409).json({
        message: "Device identifier is already linked to another account. If this is your device, please contact support or use a different account."
      });
    }
    throw err;
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const device = await updateDevice(req.params.id, req.body, req.user!);
    res.json({ device });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "NotFound") return res.status(404).json({ message: "Device not found" });
    if (msg === "UserNotFound") return res.status(404).json({ message: "Target user not found" });
    if (msg === "Forbidden") return res.status(403).json({ message: "Forbidden" });
    throw err;
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    await deleteDevice(req.params.id, req.user!);
    res.status(204).send();
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "NotFound") return res.status(404).json({ message: "Device not found" });
    if (msg === "Forbidden") return res.status(403).json({ message: "Forbidden" });
    throw err;
  }
};


