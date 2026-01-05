import { Router } from "express";
import { z } from "zod";
import { 
  customRangeSummary, 
  dailySeries, 
  dailySummary, 
  ingest, 
  weeklySummary,
  aggregatedWeeklySummary,
  aggregatedDailySeries,
  aggregatedCustomRangeSummary,
} from "../controllers/usageController";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware";
import { optionalAuthenticate } from "../middleware/optionalAuthMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();

// Usage logs endpoint - allow either API key OR JWT authentication
router.post(
  "/logs",
  validateRequest(
    z.object({
      body: z.object({
        deviceIdentifier: z.string().min(3),
        appPackage: z.string().min(1),
        appName: z.string().optional(),
        durationSeconds: z.number().int().positive(),
        occurredAt: z
          .string()
          .datetime()
          .transform((val) => new Date(val))
          .optional(),
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
      console.warn("[UsageRoutes] /logs called without auth and no INGESTION_API_KEY set - allowing for development");
    }

    return ingest(req, res).catch(next);
  }
);

router.use(authenticate, authorizeRoles(Role.ADMIN, Role.USER));

router.get(
  "/summary/daily/:deviceId",
  validateRequest(
    z.object({
      params: z.object({ deviceId: z.string() }),
      query: z.object({ date: z.string().optional() }),
      body: z.object({}).optional(),
    })
  ),
  dailySummary
);

router.get(
  "/summary/weekly/:deviceId",
  validateRequest(
    z.object({
      params: z.object({ deviceId: z.string() }),
      query: z.object({ start: z.string().optional() }),
      body: z.object({}).optional(),
    })
  ),
  weeklySummary
);

router.get(
  "/summary/range/:deviceId",
  validateRequest(
    z.object({
      params: z.object({ deviceId: z.string() }),
      query: z.object({ start: z.string(), end: z.string() }),
      body: z.object({}).optional(),
    })
  ),
  customRangeSummary
);

router.get(
  "/summary/daily-series/:deviceId",
  validateRequest(
    z.object({
      params: z.object({ deviceId: z.string() }),
      query: z.object({ days: z.string().optional() }),
      body: z.object({}).optional(),
    })
  ),
  dailySeries
);

// Aggregated analytics endpoints (across all devices)
router.get(
  "/summary/aggregated/weekly",
  validateRequest(
    z.object({
      params: z.object({}).optional(),
      query: z.object({ start: z.string().optional() }),
      body: z.object({}).optional(),
    })
  ),
  aggregatedWeeklySummary
);

router.get(
  "/summary/aggregated/daily-series",
  validateRequest(
    z.object({
      params: z.object({}).optional(),
      query: z.object({ days: z.string().optional() }),
      body: z.object({}).optional(),
    })
  ),
  aggregatedDailySeries
);

router.get(
  "/summary/aggregated/range",
  validateRequest(
    z.object({
      params: z.object({}).optional(),
      query: z.object({ start: z.string(), end: z.string() }),
      body: z.object({}).optional(),
    })
  ),
  aggregatedCustomRangeSummary
);

export const usageRouter = router;


