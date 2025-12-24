import { Router } from "express";
import { z } from "zod";
import { sync } from "../controllers/analyticsController";
import { optionalAuthenticate } from "../middleware/optionalAuthMiddleware";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// Analytics sync endpoint - allow either API key OR JWT authentication
router.post(
  "/sync",
  validateRequest(
    z.object({
      body: z.object({
        deviceIdentifier: z.string().min(3),
        summaries: z.array(
          z.object({
            appPackage: z.string().min(1),
            appName: z.string().optional(),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
            dailyMinutes: z.number().int().min(0),
            weeklyMinutes: z.number().int().min(0).optional(),
            monthlyMinutes: z.number().int().min(0).optional(),
            isBlocked: z.boolean().optional(),
          })
        ),
      }),
      params: z.object({}).optional(),
      query: z.object({}).optional(),
    })
  ),
  // Try optional JWT authentication (doesn't fail if missing)
  optionalAuthenticate,
  // Then check if we have either JWT auth OR API key
  (req, res, next) => {
    const ingestionKey = process.env.INGESTION_API_KEY;
    const hasJwtAuth = !!req.user;
    const hasApiKey = ingestionKey && req.headers["x-api-key"] === ingestionKey;

    if (!hasJwtAuth && !hasApiKey) {
      if (ingestionKey) {
        return res.status(401).json({ message: "Authentication required (JWT token or API key)" });
      }
      // No API key configured, allow unauthenticated (development only)
      console.warn("[AnalyticsRoutes] /sync called without auth and no INGESTION_API_KEY set - allowing for development");
    }

    return sync(req, res).catch(next);
  }
);

export const analyticsRouter = router;
