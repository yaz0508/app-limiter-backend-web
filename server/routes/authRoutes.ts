import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { login, me, register } from "../controllers/authController";
import { authenticate } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
  // Disable trust proxy validation: we trust only the first proxy (Render's load balancer).
  validate: {
    trustProxy: false,
  },
});

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

router.post("/login", authLimiter, validateRequest(credentialsSchema), login);
router.post("/register", authLimiter, validateRequest(registerSchema), register);
router.get("/me", authenticate, me);

export const authRouter = router;


