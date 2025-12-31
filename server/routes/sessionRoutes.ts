import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import {
  create,
  getActive,
  listForDevice,
  remove,
  start,
  stop,
  update,
  pause,
  resume,
} from "../controllers/sessionController";

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
  listForDevice
);

router.post(
  "/",
  validateRequest(
    z.object({
      body: z.object({
        deviceId: z.string(),
        name: z.string().min(1),
        durationMinutes: z.number().int().min(5).max(360),
        apps: z
          .array(
            z.object({
              packageName: z.string().min(1),
              appName: z.string().optional(),
            })
          )
          .min(1),
      }),
      params: z.object({}).optional(),
      query: z.object({}).optional(),
    })
  ),
  create
);

router.put(
  "/:id",
  validateRequest(
    z.object({
      params: z.object({ id: z.string() }),
      body: z.object({
        name: z.string().min(1).optional(),
        durationMinutes: z.number().int().min(5).max(360).optional(),
        apps: z
          .array(
            z.object({
              packageName: z.string().min(1),
              appName: z.string().optional(),
            })
          )
          .min(1)
          .optional(),
      }),
      query: z.object({}).optional(),
    })
  ),
  update
);

router.delete(
  "/:id",
  validateRequest(
    z.object({
      params: z.object({ id: z.string() }),
      body: z.object({}).optional(),
      query: z.object({}).optional(),
    })
  ),
  remove
);

router.get(
  "/device/:deviceId/active",
  validateRequest(
    z.object({
      params: z.object({ deviceId: z.string() }),
      query: z.object({}).optional(),
      body: z.object({}).optional(),
    })
  ),
  getActive
);

router.post(
  "/device/:deviceId/start",
  validateRequest(
    z.object({
      params: z.object({ deviceId: z.string() }),
      body: z.object({ sessionId: z.string() }),
      query: z.object({}).optional(),
    })
  ),
  start
);

router.post(
  "/device/:deviceId/stop",
  validateRequest(
    z.object({
      params: z.object({ deviceId: z.string() }),
      body: z.object({}).optional(),
      query: z.object({}).optional(),
    })
  ),
  stop
);

router.post(
  "/device/:deviceId/pause",
  validateRequest(
    z.object({
      params: z.object({ deviceId: z.string() }),
      body: z.object({}).optional(),
      query: z.object({}).optional(),
    })
  ),
  pause
);

router.post(
  "/device/:deviceId/resume",
  validateRequest(
    z.object({
      params: z.object({ deviceId: z.string() }),
      body: z.object({}).optional(),
      query: z.object({}).optional(),
    })
  ),
  resume
);

export const sessionRouter = router;


