import { Router } from "express";
import { z } from "zod";
import { create, get, list, remove, update } from "../controllers/userController";
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

router.get("/", authorizeRoles(Role.ADMIN, Role.PARENT), list);
router.get(
  "/:id",
  authorizeRoles(Role.ADMIN, Role.PARENT, Role.USER),
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

router.put(
  "/:id",
  authorizeRoles(Role.ADMIN, Role.PARENT, Role.USER),
  validateRequest(
    z.object({
      params: z.object({ id: z.string() }),
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


