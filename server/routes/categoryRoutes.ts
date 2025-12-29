import express from "express";
import {
  create,
  list,
  get,
  update,
  remove,
  createLimit,
  getDeviceLimits,
  removeLimit,
} from "../controllers/categoryController";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import { z } from "zod";

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  validateRequest(
    z.object({
      body: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        appIds: z.array(z.string()).optional(),
      }),
    })
  ),
  create
);

router.get("/", list);

router.get(
  "/:id",
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
  validateRequest(
    z.object({
      params: z.object({
        id: z.string(),
      }),
      body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        appIds: z.array(z.string()).optional(),
      }),
    })
  ),
  update
);

router.delete(
  "/:id",
  validateRequest(
    z.object({
      params: z.object({
        id: z.string(),
      }),
    })
  ),
  remove
);

router.post(
  "/limits",
  validateRequest(
    z.object({
      body: z.object({
        deviceId: z.string(),
        categoryId: z.string(),
        dailyLimitMinutes: z.number().min(30).max(300),
      }),
    })
  ),
  createLimit
);

router.get(
  "/limits/device/:deviceId",
  validateRequest(
    z.object({
      params: z.object({
        deviceId: z.string(),
      }),
    })
  ),
  getDeviceLimits
);

router.delete(
  "/limits/device/:deviceId/category/:categoryId",
  validateRequest(
    z.object({
      params: z.object({
        deviceId: z.string(),
        categoryId: z.string(),
      }),
    })
  ),
  removeLimit
);

export default router;

