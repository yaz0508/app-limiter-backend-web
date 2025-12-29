import express from "express";
import { getInsights } from "../controllers/insightsController";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import { z } from "zod";

const router = express.Router();

router.use(authenticate);

router.get(
  "/device/:deviceId",
  validateRequest(
    z.object({
      params: z.object({
        deviceId: z.string(),
      }),
      query: z.object({
        days: z.string().optional(),
      }).optional(),
    })
  ),
  getInsights
);

export default router;

