import express from "express";
import {
  create,
  list,
  get,
  update,
  getActiveForDevice,
  getActiveForDeviceIdentifier,
} from "../controllers/overrideController";
import { authenticate } from "../middleware/authMiddleware";
import { optionalAuthenticate } from "../middleware/optionalAuthMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import { z } from "zod";
import { OverrideStatus } from "@prisma/client";

const router = express.Router();

// Create override request (can be called by device or admin)
router.post(
  "/",
  optionalAuthenticate,
  validateRequest(
    z.object({
      body: z.object({
        deviceId: z.string().optional(),
        deviceIdentifier: z.string().optional(),
        appId: z.string(),
        requestedMinutes: z.number().min(15).max(240),
        reason: z.string().optional(),
      }),
    })
  ),
  create
);

// List override requests (admin only)
router.get(
  "/",
  authenticate,
  validateRequest(
    z.object({
      query: z.object({
        deviceId: z.string().optional(),
        status: z.nativeEnum(OverrideStatus).optional(),
      }).optional(),
    })
  ),
  list
);

router.get(
  "/:id",
  authenticate,
  validateRequest(
    z.object({
      params: z.object({
        id: z.string(),
      }),
    })
  ),
  get
);

router.put(
  "/:id",
  authenticate,
  validateRequest(
    z.object({
      params: z.object({
        id: z.string(),
      }),
      body: z.object({
        status: z.nativeEnum(OverrideStatus),
        expiresAt: z.string().datetime().optional(),
      }),
    })
  ),
  update
);

router.get(
  "/device/:deviceId/active",
  authenticate,
  validateRequest(
    z.object({
      params: z.object({
        deviceId: z.string(),
      }),
    })
  ),
  getActiveForDevice
);

// Mobile endpoint
router.get(
  "/mobile/device/:deviceIdentifier/active",
  optionalAuthenticate,
  validateRequest(
    z.object({
      params: z.object({
        deviceIdentifier: z.string(),
      }),
    })
  ),
  getActiveForDeviceIdentifier
);

export default router;

