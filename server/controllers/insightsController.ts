import { Request, Response } from "express";
import { getUsageInsights } from "../services/insightsService";
import { getDeviceForRequester } from "../services/deviceService";

export const getInsights = async (req: Request, res: Response) => {
  try {
    const device = await getDeviceForRequester(req.params.deviceId, req.user!);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const insights = await getUsageInsights(req.params.deviceId, days);
    res.json({ insights });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to get insights" });
  }
};

