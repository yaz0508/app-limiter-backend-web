import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/authRoutes";
import { userRouter } from "./routes/userRoutes";
import { deviceRouter } from "./routes/deviceRoutes";
import { limitRouter } from "./routes/limitRoutes";
import { usageRouter } from "./routes/usageRoutes";
import { appRouter } from "./routes/appRoutes";
import { analyticsRouter } from "./routes/analyticsRoutes";
import { sessionRouter } from "./routes/sessionRoutes";
import { mobileSessionRouter } from "./routes/mobileSessionRoutes";
import categoryRouter from "./routes/categoryRoutes";
import overrideRouter from "./routes/overrideRoutes";
import insightsRouter from "./routes/insightsRoutes";
import { goalRouter } from "./routes/goalRoutes";
import { hourlyUsageRouter } from "./routes/hourlyUsageRoutes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Trust proxy: trust only the first proxy (Render's load balancer).
// This is required for accurate IP-based rate limiting behind proxies.
app.set("trust proxy", 1);

const NODE_ENV = process.env.NODE_ENV ?? "development";

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

// Fail fast in production for critical secrets/config.
if (NODE_ENV === "production") {
  requireEnv("JWT_SECRET");
  requireEnv("DATABASE_URL");
  requireEnv("CORS_ORIGIN");
}

const corsOrigin = process.env.CORS_ORIGIN;

// Configure CORS: explicit allowlist, no cookies (Bearer tokens).
// If you later switch to cookie auth, re-enable credentials and DO NOT use "*" origins.
let corsConfig: cors.CorsOptions = {
  credentials: false,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Type"],
};

const defaultDevOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins =
  corsOrigin && corsOrigin.trim() !== ""
    ? corsOrigin
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
    : NODE_ENV === "production"
      ? []
      : defaultDevOrigins;

corsConfig.origin =
  allowedOrigins.length === 0
    ? false
    : (origin, callback) => {
      // Non-browser tools (Android apps, Postman, etc.) may send no Origin; always allow those.
      if (!origin) {
        console.log(`[CORS] Allowing request with no Origin header (likely mobile app or API tool)`);
        return callback(null, true);
      }

      // Normalize origin (remove trailing slash)
      const normalizedOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;

      // Check exact match
      if (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin)) {
        console.log(`[CORS] Allowing origin: ${origin}`);
        return callback(null, true);
      }

      // Check if any allowed origin matches (case-insensitive, handle protocol variations)
      const originLower = normalizedOrigin.toLowerCase();
      const matches = allowedOrigins.some(allowed => {
        const allowedLower = allowed.toLowerCase();
        const allowedNormalized = allowedLower.endsWith("/") ? allowedLower.slice(0, -1) : allowedLower;
        return originLower === allowedNormalized;
      });

      if (matches) {
        return callback(null, true);
      }

      // Log rejected origin for debugging
      console.warn(`[CORS] Rejected origin: ${origin}. Allowed origins: ${allowedOrigins.join(", ")}`);
      console.warn(`[CORS] Normalized origin: ${normalizedOrigin}`);
      console.warn(`[CORS] CORS_ORIGIN env: ${corsOrigin}`);
      return callback(new Error(`CORS origin not allowed: ${origin}`));
    };

// Log CORS configuration
console.log("CORS Configuration:", {
  NODE_ENV,
  CORS_ORIGIN: corsOrigin || "(not set - using safe defaults)",
  CORS_ORIGIN_RAW: JSON.stringify(corsOrigin),
  credentials: corsConfig.credentials,
  methods: corsConfig.methods,
  allowedOrigins: allowedOrigins.length === 0 ? "(none - all non-browser requests allowed)" : allowedOrigins,
  allowedOriginsCount: allowedOrigins.length,
  note: "Requests without Origin header (Android apps, API tools) are always allowed",
});

// Apply CORS middleware
app.use(cors(corsConfig));

// Handle preflight requests explicitly (some browsers need this)
app.options("*", cors(corsConfig));

// Configure Helmet to work with CORS
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Simple request-id for correlating logs/errors.
app.use((req, res, next) => {
  const requestId =
    (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();
  res.setHeader("x-request-id", requestId);
  (req as any).requestId = requestId;
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Basic rate limiting to protect auth endpoints from brute-force and reduce abuse.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === "production" ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter limiter for login attempts.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === "production" ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter);
app.use("/api/auth/login", loginLimiter);

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/devices", deviceRouter);
app.use("/api/limits", limitRouter);
app.use("/api/usage", usageRouter);
app.use("/api/apps", appRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/sessions", sessionRouter);
app.use("/api/mobile/sessions", mobileSessionRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/overrides", overrideRouter);
app.use("/api/insights", insightsRouter);
app.use("/api", goalRouter);
app.use("/api/hourly", hourlyUsageRouter);

app.use(notFoundHandler);
app.use(errorHandler);

// Run admin seed on startup (idempotent, safe to run every time).
const runStartupSeed = async () => {
  try {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME?.trim() || "Admin";

    if (!email || !password) {
      console.log("[STARTUP] Seed skipped: ADMIN_EMAIL and ADMIN_PASSWORD not set.");
      return;
    }

    console.log(`[STARTUP] Creating/updating admin user: ${email}`);
    const bcrypt = await import("bcryptjs");
    const { prisma } = await import("./prisma/client");

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.upsert({
      where: { email },
      update: { name, passwordHash, role: "ADMIN" },
      create: { email, name, passwordHash, role: "ADMIN" },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    console.log("[STARTUP] Admin user ready:", { id: user.id, email: user.email, role: user.role });
  } catch (error) {
    // Don't crash server if seed fails.
    console.error("[STARTUP] Seed error (non-fatal):", error);
  }
};

app.listen(port, async () => {
  console.log(`API listening on port ${port}`);
  // Run seed in background (non-blocking).
  runStartupSeed().catch(console.error);
});


