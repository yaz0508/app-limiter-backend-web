import { Router } from "express";
import { z } from "zod";
import {
  create,
  list,
  getProgress,
  getAllProgress,
  update,
  remove,
} from "../controllers/goalController";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();

const createGoalSchema = z.object({
  body: z.object({
    type: z.enum(["DAILY_TOTAL", "WEEKLY_TOTAL", "APP_SPECIFIC", "CATEGORY_SPECIFIC"]),
    targetMinutes: z.number().int().positive(),
    appId: z.string().optional(),
    categoryId: z.string().optional(),
    name: z.string().optional(),
    endDate: z.string().datetime().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateGoalSchema = z.object({
  body: z.object({
    targetMinutes: z.number().int().positive().optional(),
    name: z.string().optional(),
    status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
    endDate: z.string().datetime().nullable().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

router.use(authenticate, authorizeRoles(Role.ADMIN, Role.USER));

router.post(
  "/device/:deviceId/goals",
  validateRequest(createGoalSchema),
  create
);

router.get("/device/:deviceId/goals", list);
router.get("/device/:deviceId/goals/progress", getAllProgress);
router.get("/goals/:goalId/progress", getProgress);
router.patch(
  "/goals/:goalId",
  validateRequest(updateGoalSchema),
  update
);
router.delete("/goals/:goalId", remove);

export const goalRouter = router;


