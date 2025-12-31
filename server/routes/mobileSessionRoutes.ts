import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validateRequest";
import { optionalAuthenticate } from "../middleware/optionalAuthMiddleware";
import {
  getActiveForDeviceIdentifier,
  listForDeviceIdentifier,
  startForDeviceIdentifier,
  stopForDeviceIdentifier,
  createForDeviceIdentifier,
  pauseForDeviceIdentifier,
  resumeForDeviceIdentifier,
} from "../controllers/mobileSessionController";

const router = Router();

// Mobile endpoints (deviceIdentifier-based). Allow either JWT or INGESTION_API_KEY (same as /usage/logs and /analytics/sync).
router.use(optionalAuthenticate);

router.use((req, res, next) => {
  const ingestionKey = process.env.INGESTION_API_KEY;
  const hasJwtAuth = !!req.user;
  const hasApiKey = ingestionKey && req.headers["x-api-key"] === ingestionKey;

  if (!hasJwtAuth && !hasApiKey) {
    if (ingestionKey) {
      return res.status(401).json({ message: "Authentication required (JWT token or API key)" });
    }
    console.warn("[MobileSessionRoutes] called without auth and no INGESTION_API_KEY set - allowing for development");
  }

  next();
});

router.get(
  "/:deviceIdentifier",
  validateRequest(
    z.object({
      params: z.object({ deviceIdentifier: z.string().min(3) }),
      query: z.object({}).optional(),
      body: z.object({}).optional(),
    })
  ),
  listForDeviceIdentifier
);

router.get(
  "/:deviceIdentifier/active",
  validateRequest(
    z.object({
      params: z.object({ deviceIdentifier: z.string().min(3) }),
      query: z.object({}).optional(),
      body: z.object({}).optional(),
    })
  ),
  getActiveForDeviceIdentifier
);

router.post(
  "/:deviceIdentifier/start",
  validateRequest(
    z.object({
      params: z.object({ deviceIdentifier: z.string().min(3) }),
      body: z.object({ sessionId: z.string().min(3) }),
      query: z.object({}).optional(),
    })
  ),
  startForDeviceIdentifier
);

router.post(
  "/:deviceIdentifier/stop",
  validateRequest(
    z.object({
      params: z.object({ deviceIdentifier: z.string().min(3) }),
      body: z.object({}).optional(),
      query: z.object({}).optional(),
    })
  ),
  stopForDeviceIdentifier
);

router.post(
  "/:deviceIdentifier",
  validateRequest(
    z.object({
      params: z.object({ deviceIdentifier: z.string().min(3) }),
      body: z.object({
        name: z.string().min(1),
        durationMinutes: z.number().int().min(5).max(360),
        apps: z.array(
          z.object({
            packageName: z.string().min(1),
            appName: z.string().optional(),
          })
        ).min(1),
      }),
      query: z.object({}).optional(),
    })
  ),
  createForDeviceIdentifier
);

router.post(
  "/:deviceIdentifier/pause",
  validateRequest(
    z.object({
      params: z.object({ deviceIdentifier: z.string().min(3) }),
      body: z.object({}).optional(),
      query: z.object({}).optional(),
    })
  ),
  pauseForDeviceIdentifier
);

router.post(
  "/:deviceIdentifier/resume",
  validateRequest(
    z.object({
      params: z.object({ deviceIdentifier: z.string().min(3) }),
      body: z.object({}).optional(),
      query: z.object({}).optional(),
    })
  ),
  resumeForDeviceIdentifier
);

export const mobileSessionRouter = router;


