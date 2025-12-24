import { Request, Response } from "express";
import { syncAnalytics } from "../services/analyticsService";

export const sync = async (req: Request, res: Response) => {
  try {
    console.log(`[AnalyticsController] Syncing analytics:`, {
      deviceIdentifier: req.body.deviceIdentifier,
      summaryCount: req.body.summaries?.length || 0,
      authenticated: !!req.user
    });

    const result = await syncAnalytics(req.body);
    console.log(`[AnalyticsController] Successfully synced analytics: ${result.synced} summaries, ${result.errors} errors`);
    res.status(200).json(result);
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[AnalyticsController] Error syncing analytics:`, err);
    if (msg === "DeviceNotRegistered") {
      return res.status(400).json({ message: "Device not registered" });
    }
    throw err;
  }
};
