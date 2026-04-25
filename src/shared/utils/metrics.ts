import { Request, Response } from "express";
import client from "prom-client";

const register = new client.Registry();

client.collectDefaultMetrics({
  prefix: "brimble_",
  register,
});

// HTTP metrics
export const requestDurationHistogram = new client.Histogram({
  name: "brimble_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  buckets: [0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0],
  registers: [register],
  labelNames: ["method", "route", "status_code", "success"],
});

export const httpRequestCounter = new client.Counter({
  name: "brimble_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code", "success"],
  registers: [register],
});

export const httpErrorCounter = new client.Counter({
  name: "brimble_http_errors_total",
  help: "HTTP errors by route and type",
  labelNames: ["method", "route", "status_code", "error_type"],
  registers: [register],
});

export const databaseQueryDuration = new client.Histogram({
  name: "brimble_db_query_duration_seconds",
  help: "Database query duration in seconds",
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0],
  registers: [register],
  labelNames: ["operation", "domain", "status"],
});

export const databaseQueryErrors = new client.Counter({
  name: "brimble_db_query_errors_total",
  help: "Total database query errors",
  labelNames: ["operation", "domain"],
  registers: [register],
});

export const serviceInitCounter = new client.Counter({
  name: "brimble_service_init_attempts_total",
  help: "Service initialization attempts",
  labelNames: ["component", "status"],
  registers: [register],
});

export const serviceInitDuration = new client.Histogram({
  name: "brimble_service_init_duration_seconds",
  help: "Service initialization duration",
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  labelNames: ["component", "status"],
  registers: [register],
});

// Worker / consumer metrics
export const workerTasksTotal = new client.Counter({
  name: "brimble_worker_tasks_total",
  help: "Tasks processed by worker consumers",
  registers: [register],
  labelNames: ["topic", "domain"],
});

export const workerErrors = new client.Counter({
  name: "brimble_worker_errors_total",
  help: "Worker consumer errors",
  registers: [register],
  labelNames: ["topic", "domain"],
});

export const workerQueueDepth = new client.Gauge({
  name: "brimble_worker_queue_depth",
  help: "Current depth of worker queue",
  registers: [register],
  labelNames: ["topic"],
});

// Pipeline metrics per domain + phase
export const pipelineDuration = new client.Histogram({
  name: "brimble_pipeline_duration_seconds",
  help: "Deployment pipeline phase duration",
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [register],
  labelNames: ["phase", "domain", "status"],
});

export const pipelineErrors = new client.Counter({
  name: "brimble_pipeline_errors_total",
  help: "Deployment pipeline errors",
  labelNames: ["phase", "domain"],
  registers: [register],
});

// General error counter
export const errorCounter = new client.Counter({
  name: "brimble_errors_total",
  help: "Total errors",
  labelNames: ["error_type", "operation", "domain", "severity"],
  registers: [register],
});

export const serviceHealth = new client.Gauge({
  name: "brimble_service_health",
  help: "Service health (1=healthy, 0=unhealthy)",
  registers: [register],
});

// Helper: track an error
export const trackError = (
  errorType: string,
  operation: string,
  domain: string,
  severity: "low" | "medium" | "high" | "critical" = "medium"
) => {
  errorCounter.inc({ error_type: errorType, operation, domain, severity });
};

// Helper: wrap a DB query with duration + error tracking
export async function measureDatabaseQuery<T>(
  operation: string,
  fn: () => Promise<T>,
  domain: string
): Promise<T> {
  const end = databaseQueryDuration.startTimer({ operation, domain });
  try {
    const result = await fn();
    end({ status: "success" });
    return result;
  } catch (error) {
    end({ status: "error" });
    databaseQueryErrors.inc({ operation, domain });
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        trackError("db_timeout", operation, domain, "high");
      } else if (error.message.includes("connection")) {
        trackError("db_connection_error", operation, domain, "critical");
      } else {
        trackError("db_query_error", operation, domain, "medium");
      }
    }
    throw error;
  }
}

export function trackHttpRequest(
  req: Request,
  res: Response,
  startTime: [number, number]
) {
  const [sec, ns] = process.hrtime(startTime);
  const durationSeconds = sec + ns / 1e9;
  const success = res.statusCode < 400 ? "true" : "false";
  const route = req.route?.path ?? req.url;

  const labels = {
    method: req.method,
    route,
    status_code: res.statusCode.toString(),
    success,
  };

  requestDurationHistogram.observe(labels, durationSeconds);
  httpRequestCounter.inc(labels);

  if (res.statusCode >= 400) {
    httpErrorCounter.inc({
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
      error_type: res.statusCode >= 500 ? "server_error" : "client_error",
    });
  }
}

export async function measurePipelinePhase<T>(
  phase: string,
  domain: string,
  fn: () => Promise<T>
): Promise<T> {
  const end = pipelineDuration.startTimer({ phase, domain });
  try {
    const result = await fn();
    end({ status: "success" });
    return result;
  } catch (error) {
    end({ status: "error" });
    pipelineErrors.inc({ phase, domain });
    throw error;
  }
}

export const brimbleRegistry = register;