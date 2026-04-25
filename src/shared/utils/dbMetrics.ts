import { Histogram, Counter } from "prom-client";

const queryDuration = new Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["query", "domain", "status"] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
});

const queryErrors = new Counter({
  name: "db_query_errors_total",
  help: "Total number of failed database queries",
  labelNames: ["query", "domain"] as const,
});

export async function measureDatabaseQuery<T>(
  queryName: string,
  fn: () => Promise<T>,
  domain: string
): Promise<T> {
  const end = queryDuration.startTimer({ query: queryName, domain });
  try {
    const result = await fn();
    end({ status: "success" });
    return result;
  } catch (error) {
    end({ status: "error" });
    queryErrors.inc({ query: queryName, domain });
    throw error;
  }
}