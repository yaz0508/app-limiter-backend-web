import express from "express";
import { getInsights } from "../controllers/insightsController";
import { authenticate } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
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

