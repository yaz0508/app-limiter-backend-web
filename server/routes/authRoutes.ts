import { Router } from "express";
import { z } from "zod";
import { login, me, register } from "../controllers/authController";
import { authenticate } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

const credentialsSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().min(2),
    password: z.string().min(6),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.post("/login", validateRequest(credentialsSchema), login);
router.post("/register", validateRequest(registerSchema), register);
router.get("/me", authenticate, me);

export const authRouter = router;


