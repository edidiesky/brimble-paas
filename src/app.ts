import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { requestIdMiddleware } from "./infra/middleware/requestid.middleware";
import { errorHandler } from "./infra/middleware/error-handler";
import deploymentRoutes from "./domains/deployment/deployment.routes";
import deadLetterRoutes from "./domains/dead-letter/dead-letter.routes";
import { createLogger } from "./shared/utils/logger";
import { SERVICE_NAME, NODE_ENV } from "./shared/constants";

const logger = createLogger(SERVICE_NAME);
const app = express();

// Security
app.use(helmet());
app.use(cors());

// Request parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Request ID
app.use(requestIdMiddleware);

// HTTP request logging
if (NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

// Metrics middleware
app.use((req, res, next) => {
  const startTime = process.hrtime();
  res.on("finish", () => {
    const duration = process.hrtime(startTime);
    const durationSeconds = duration[0] + duration[1] / 1e9;

    logger.info("http_request", {
      event: "http_request",
      service: SERVICE_NAME,
      method: req.method,
      route: req.route?.path ?? req.path,
      statusCode: res.statusCode,
      durationSeconds,
      requestId: (req as unknown as { requestId: string }).requestId,
    });
  });
  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: SERVICE_NAME });
});

// API routes
app.use("/api/deployments", deploymentRoutes);
app.use("/api/dead-letters", deadLetterRoutes);

app.use(errorHandler);

export { app };
