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
let corsConfig: cors.CorsOptions = {
  credentials: true,
};

if (corsOrigin) {
  const normalizedOrigin = corsOrigin.trim();
  if (normalizedOrigin === "*" || normalizedOrigin === "true" || normalizedOrigin === "") {
    corsConfig.origin = true; // Allow all origins
  } else {
    corsConfig.origin = normalizedOrigin.split(",").map((origin) => origin.trim());
  }
} else {
  corsConfig.origin = true; // Default: allow all origins
}

// Log CORS configuration
console.log("CORS Configuration:", {
  CORS_ORIGIN: corsOrigin || "(not set - allowing all)",
  allowedOrigins: corsConfig.origin === true ? "all origins" : corsConfig.origin,
});

app.use(cors(corsConfig));
app.use(helmet());
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


