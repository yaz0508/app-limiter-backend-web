import { Router } from "express";
import { hourly, dailyHourly, peakHours } from "../controllers/hourlyUsageController";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate, authorizeRoles(Role.ADMIN, Role.USER));

router.get("/device/:deviceId/hourly", hourly);
router.get("/device/:deviceId/hourly/range", dailyHourly);
router.get("/device/:deviceId/hourly/peak", peakHours);

export const hourlyUsageRouter = router;


