import { Router } from "express";
import { z } from "zod";
import { create, list } from "../controllers/appController";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate, authorizeRoles(Role.ADMIN, Role.PARENT));

router.get("/", list);

router.post(
  "/",
  validateRequest(
    z.object({
      body: z.object({
        packageName: z.string().min(1),
        name: z.string().min(1),
      }),
      query: z.object({}).optional(),
      params: z.object({}).optional(),
    })
  ),
  create
);

export const appRouter = router;


