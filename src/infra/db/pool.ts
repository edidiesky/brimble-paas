import { Pool } from "pg";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";

const logger = createLogger(SERVICE_NAME);

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    throw new Error("Database pool not initialized. Call initPool() first.");
  }
  return pool;
}

export async function initPool(connectionString: string): Promise<void> {
  pool = new Pool({
    connectionString,
    max: 20,
    min: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  // Verify connection
  const client = await pool.connect();
  await client.query("SELECT 1");
  client.release();

  logger.info("postgres_pool_initialized", {
    event: "postgres_pool_initialized",
    service: SERVICE_NAME,
  });
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;

    logger.info("postgres_pool_closed", {
      event: "postgres_pool_closed",
      service: SERVICE_NAME,
    });
  }
}