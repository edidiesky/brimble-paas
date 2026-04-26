import { Pool } from "pg";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";
import {
  dbPoolCheckoutDuration,
  dbPoolIdleConnections,
  dbPoolSize,
  dbPoolWaitingCount,
} from "../../shared/utils/metrics";

const logger = createLogger(SERVICE_NAME);

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    throw new Error("Database pool not initialized. Call initPool() first.");
  }
  return pool;
}

/**
 * Wire pg.Pool events to Prometheus gauges.
 *
 * pg.Pool emits:
 *   connect   - new physical connection established (pool grew)
 *   acquire   - client checked out from pool (start of checkout wait)
 *   remove    - physical connection removed (pool shrank)
 *
 * pg does not emit a built-in "release" event with wait duration, so we
 * patch pool.connect() to measure time-to-acquire ourselves.
 */
function instrumentPool(p: Pool): void {
  // Reflect current pool state into gauges on every acquire/remove.
  // p.totalCount  = idle + active connections
  // p.idleCount   = connections not currently checked out
  // p.waitingCount = queries queued waiting for a free connection

  const syncGauges = () => {
    dbPoolSize.set(p.totalCount);
    dbPoolIdleConnections.set(p.idleCount);
    dbPoolWaitingCount.set(p.waitingCount);
  };

  p.on("connect", syncGauges);
  p.on("acquire", syncGauges);
  p.on("remove", syncGauges);

  // Patch connect to measure checkout latency.
  // We wrap the original method rather than monkey-patching the prototype
  // so only this instance is affected.
  const originalConnect = p.connect.bind(p);

  p.connect = async function patchedConnect(...args: unknown[]) {
    const checkoutStart = process.hrtime();
    const client = await originalConnect(...(args as []));
    const [sec, ns] = process.hrtime(checkoutStart);
    dbPoolCheckoutDuration.observe(sec + ns / 1e9);
    return client;
  };
}

export async function initPool(connectionString: string): Promise<void> {
  // Guard: if pool is already open and connected, skip re-initialisation.
  // In integration tests with runInBand, setupFilesAfterEnv calls initPool
  // once per test file. Without this guard, each file creates a new pool
  // and the previous pool's idle connections cause connection timeout errors
  // when pg tries to drain them while the new pool is starting.
  if (pool) {
    return;
  }

  pool = new Pool({
    connectionString,
    max: 20,
    min: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  // Verify connection before registering as ready
  const client = await pool.connect();
  await client.query("SELECT 1");
  client.release();

  try { instrumentPool(pool); } catch { /* metrics unavailable in test env */ }

  logger.info("postgres_pool_initialized", {
    event: "postgres_pool_initialized",
    service: SERVICE_NAME,
  });
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;

    // Zero out gauges on shutdown so Grafana does not show stale values
    dbPoolSize.set(0);
    dbPoolIdleConnections.set(0);
    dbPoolWaitingCount.set(0);

    logger.info("postgres_pool_closed", {
      event: "postgres_pool_closed",
      service: SERVICE_NAME,
    });
  }
}