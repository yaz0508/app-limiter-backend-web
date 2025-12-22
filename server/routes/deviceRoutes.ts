import { Router } from "express";
import { z } from "zod";
import { create, get, list, remove, update } from "../controllers/deviceController";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate, authorizeRoles(Role.ADMIN, Role.USER));

router.get("/", list);

router.post(
  "/",
  validateRequest(
    z.object({
      body: z.object({
        name: z.string().min(2),
        os: z.string().optional(),
        deviceIdentifier: z.string().min(3),
        userId: z.string().optional(),
      }),
      query: z.object({}).optional(),
      params: z.object({}).optional(),
    })
  ),
  create
);

router.get(
  "/:id",
  validateRequest(
    z.object({
      params: z.object({ id: z.string() }),
      body: z.object({}).optional(),
      query: z.object({}).optional(),
    })
  ),
  get
);

router.put(
  "/:id",
  validateRequest(
    z.object({
      params: z.object({ id: z.string() }),
      body: z.object({
        name: z.string().optional(),
        os: z.string().optional(),
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

export const deviceRouter = router;


