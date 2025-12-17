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

// Configure CORS before other middleware
const corsOptions = {
  // If CORS_ORIGIN is "*", allow all; if comma-separated list, restrict; otherwise default allow all
  origin: corsOrigin
    ? corsOrigin === "*" || corsOrigin === "true"
      ? true
      : corsOrigin.split(",").map((origin) => origin.trim())
    : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Configure Helmet with CORS-friendly settings
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
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


