import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";
import {
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getTopApps,
  getBlockEvents,
  syncAnalytics,
} from "../controllers/analyticsController";

const router = Router();

// All analytics routes require authentication
router.use(authenticate, authorizeRoles(Role.ADMIN, Role.USER));

// Analytics sync endpoint (receives aggregated data from Android)
router.post("/sync", syncAnalytics);

// Analytics retrieval endpoints
router.get("/daily/:deviceId", getDailyAnalytics);
router.get("/weekly/:deviceId", getWeeklyAnalytics);
router.get("/monthly/:deviceId", getMonthlyAnalytics);
router.get("/top-apps/:deviceId", getTopApps);
router.get("/block-events/:deviceId", getBlockEvents);

export default router;
