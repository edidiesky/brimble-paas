import { initPool, closePool } from "../db/pool";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";

const logger = createLogger(SERVICE_NAME);

export async function connectPostgres(connectionString: string): Promise<void> {
  await initPool(connectionString);

  logger.info("postgres_connected", {
    event: "postgres_connected",
    service: SERVICE_NAME,
  });
}

export async function disconnectPostgres(): Promise<void> {
  await closePool();

  logger.info("postgres_disconnected", {
    event: "postgres_disconnected",
    service: SERVICE_NAME,
  });
}
