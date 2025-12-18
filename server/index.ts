import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
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

const corsOrigin = process.env.CORS_ORIGIN;

// Configure CORS: allow all if "*" or "true", otherwise use comma-separated list, default to allow all
// Note: When credentials: true, we must use a function to dynamically set origin (can't use wildcard "*")
let corsConfig: cors.CorsOptions = {
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Type"],
};

if (corsOrigin) {
  const normalizedOrigin = corsOrigin.trim();
  if (normalizedOrigin === "*" || normalizedOrigin === "true" || normalizedOrigin === "") {
    // When credentials: true, we need to use a function to allow all origins
    // This dynamically returns the request origin, effectively allowing all
    corsConfig.origin = (origin, callback) => {
      callback(null, true); // Allow all origins
    };
  } else {
    corsConfig.origin = normalizedOrigin.split(",").map((origin) => origin.trim());
  }
} else {
  // Default: allow all origins (using function for credentials support)
  corsConfig.origin = (origin, callback) => {
    callback(null, true); // Allow all origins
  };
}

// Log CORS configuration
console.log("CORS Configuration:", {
  CORS_ORIGIN: corsOrigin || "(not set - allowing all)",
  credentials: corsConfig.credentials,
  methods: corsConfig.methods,
  originType: typeof corsConfig.origin === "function" ? "dynamic (all)" : Array.isArray(corsConfig.origin) ? "specific origins" : "all",
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


