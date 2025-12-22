import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import crypto from "crypto";
import { authRouter } from "./routes/authRoutes";
import { userRouter } from "./routes/userRoutes";
import { deviceRouter } from "./routes/deviceRoutes";
import { limitRouter } from "./routes/limitRoutes";
import { usageRouter } from "./routes/usageRoutes";
import { appRouter } from "./routes/appRoutes";
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
      // Non-browser tools may send no Origin; allow those.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS origin not allowed"));
    };

// Log CORS configuration
console.log("CORS Configuration:", {
  CORS_ORIGIN: corsOrigin || "(not set - using safe defaults)",
  credentials: corsConfig.credentials,
  methods: corsConfig.methods,
  allowedOrigins: allowedOrigins.length === 0 ? "(none)" : allowedOrigins,
});

app.use(cors(corsConfig));

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

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/devices", deviceRouter);
app.use("/api/limits", limitRouter);
app.use("/api/usage", usageRouter);
app.use("/api/apps", appRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});


