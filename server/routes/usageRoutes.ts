import { Router } from "express";
import { z } from "zod";
import { dailySummary, ingest, weeklySummary } from "../controllers/usageController";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();

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
  (req, res, next) => {
    const ingestionKey = process.env.INGESTION_API_KEY;
    if (ingestionKey && req.headers["x-api-key"] !== ingestionKey) {
      return res.status(401).json({ message: "Invalid ingestion key" });
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

export const usageRouter = router;


