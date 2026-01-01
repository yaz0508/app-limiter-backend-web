import { Router } from "express";
import { z } from "zod";
import { create, get, list, remove, update, updateMe } from "../controllers/userController";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();

const userBaseSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().min(2),
    password: z.string().min(6),
    role: z.nativeEnum(Role).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.use(authenticate);

// Admin dashboard only: list all accounts requires ADMIN.
router.get("/", authorizeRoles(Role.ADMIN), list);
router.get(
  "/:id",
  authorizeRoles(Role.ADMIN, Role.USER),
  validateRequest(
    z.object({
      params: z.object({ id: z.string() }),
      query: z.object({}).optional(),
      body: z.object({}).optional(),
    })
  ),
  get
);

router.post("/", authorizeRoles(Role.ADMIN), validateRequest(userBaseSchema), create);

// Update current user's profile (uses JWT token ID, no path parameter needed)
router.put(
  "/me",
  authorizeRoles(Role.ADMIN, Role.USER),
  validateRequest(
    z.object({
      params: z.object({}).optional(),
      body: z
        .object({
          email: z.string().email().optional(),
          name: z.string().min(2).optional(),
          password: z.string().min(6).optional(),
          role: z.nativeEnum(Role).optional(),
        })
        .refine((data) => Object.keys(data).length > 0, {
          message: "No updates provided",
        }),
      query: z.object({}).optional(),
    })
  ),
  updateMe
);

router.put(
  "/:id",
  authorizeRoles(Role.ADMIN, Role.USER),
  validateRequest(
    z.object({
      params: z.object({ id: z.string().min(1) }),
      body: z
        .object({
          email: z.string().email().optional(),
          name: z.string().min(2).optional(),
          password: z.string().min(6).optional(),
          role: z.nativeEnum(Role).optional(),
        })
        .refine((data) => Object.keys(data).length > 0, {
          message: "No updates provided",
        }),
      query: z.object({}).optional(),
    })
  ),
  update
);

router.delete(
  "/:id",
  authorizeRoles(Role.ADMIN),
  validateRequest(
    z.object({
      params: z.object({ id: z.string() }),
      body: z.object({}).optional(),
      query: z.object({}).optional(),
    })
  ),
  remove
);

export const userRouter = router;


