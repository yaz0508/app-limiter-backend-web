import { Request, Response } from "express";
import {
  createOverrideRequest,
  updateOverrideRequest,
  getOverrideRequests,
  getOverrideRequest,
  getActiveOverridesForDevice,
} from "../services/overrideService";
import { getDeviceForRequester, findDeviceByIdentifier } from "../services/deviceService";
import { OverrideStatus } from "@prisma/client";

export const create = async (req: Request, res: Response) => {
  try {
    let deviceId = req.body.deviceId;
    
    // If deviceIdentifier is provided instead, find the device
    if (!deviceId && req.body.deviceIdentifier) {
      const device = await findDeviceByIdentifier(req.body.deviceIdentifier);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      deviceId = device.id;
    }

    if (!deviceId) {
      return res.status(400).json({ message: "deviceId or deviceIdentifier is required" });
    }

    const request = await createOverrideRequest({
      ...req.body,
      deviceId,
    });
    res.status(201).json({ request });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to create override request" });
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const filters: any = {};
    if (req.query.deviceId) filters.deviceId = req.query.deviceId as string;
    if (req.query.status) filters.status = req.query.status as OverrideStatus;

    const requests = await getOverrideRequests(filters);
    res.json({ requests });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to list override requests" });
  }
};

export const get = async (req: Request, res: Response) => {
  try {
    const request = await getOverrideRequest(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Override request not found" });
    }
    res.json({ request });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to get override request" });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const request = await updateOverrideRequest(req.params.id, {
      ...req.body,
      approvedById: req.user!.id,
    });
    res.json({ request });
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Override request not found" });
    }
    res.status(500).json({ message: err.message || "Failed to update override request" });
  }
};

export const getActiveForDevice = async (req: Request, res: Response) => {
  try {
    const device = await getDeviceForRequester(req.params.deviceId, req.user!);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const overrides = await getActiveOverridesForDevice(req.params.deviceId);
    res.json({ overrides });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to get active overrides" });
  }
};

// Mobile endpoint - get active overrides by device identifier
export const getActiveForDeviceIdentifier = async (req: Request, res: Response) => {
  try {
    const device = await findDeviceByIdentifier(req.params.deviceIdentifier);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const overrides = await getActiveOverridesForDevice(device.id);
    res.json({ overrides });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to get active overrides" });
  }
};

