import { Router } from "express";
import { z } from "zod";
import { upsert, list, remove } from "../controllers/limitController";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate, authorizeRoles(Role.ADMIN, Role.USER));

router.get(
  "/device/:deviceId",
  validateRequest(
    z.object({
      params: z.object({ deviceId: z.string() }),
      query: z.object({}).optional(),
      body: z.object({}).optional(),
    })
  ),
  list
);

router.post(
  "/",
  validateRequest(
    z.object({
      body: z.object({
        deviceId: z.string(),
        appPackage: z.string(),
        appName: z.string().optional(),
        dailyLimitMinutes: z.number().int().positive(),
      }),
      params: z.object({}).optional(),
      query: z.object({}).optional(),
    })
  ),
  upsert
);

router.delete(
  "/:deviceId/:appId",
  validateRequest(
    z.object({
      params: z.object({ deviceId: z.string(), appId: z.string() }),
      query: z.object({}).optional(),
      body: z.object({}).optional(),
    })
  ),
  remove
);

export const limitRouter = router;


