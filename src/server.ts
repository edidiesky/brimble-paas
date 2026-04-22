import http from "http";
import { app } from "./app";
import { bootStrap } from "./bootStrap";
import { gracefulShutdown } from "./shutdown";
import { createLogger } from "./shared/utils/logger";
import { SERVICE_NAME, PORT, METRICS_PORT } from "./shared/constants";
import express from "express";
import { register } from "prom-client";
import client from "prom-client";

const logger = createLogger(SERVICE_NAME);

async function main(): Promise<void> {
  await bootStrap();

  // Main HTTP server
  const server = http.createServer(app);

  server.listen(PORT, () => {
    logger.info("server_started", {
      event: "server_started",
      service: SERVICE_NAME,
      port: PORT,
    });
  });

  const metricsApp = express();

  client.collectDefaultMetrics({
    prefix: "brimble_api_",
    labels: { service: SERVICE_NAME },
  });

  metricsApp.get("/metrics", async (_req, res) => {
    try {
      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      res.status(500).end(err);
    }
  });

  metricsApp.listen(METRICS_PORT, () => {
    logger.info("metrics_server_started", {
      event: "metrics_server_started",
      service: SERVICE_NAME,
      port: METRICS_PORT,
    });
  });

  // Graceful shutdown
  process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => void gracefulShutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.error("uncaught_exception", {
      event: "uncaught_exception",
      service: SERVICE_NAME,
      error: err.message,
      stack: err.stack,
    });
    void gracefulShutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("unhandled_rejection", {
      event: "unhandled_rejection",
      service: SERVICE_NAME,
      error: String(reason),
    });
    void gracefulShutdown("unhandledRejection");
  });
}

main().catch((err) => {
  logger.error("startup_failed", {
    event: "startup_failed",
    service: SERVICE_NAME,
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
