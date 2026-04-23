import { disconnectPostgres } from "./infra/config/postgres";
import { disconnectRabbitMQ } from "./infra/messaging/connection";
import { createLogger } from "./shared/utils/logger";
import { SERVICE_NAME } from "./shared/constants";

const logger = createLogger(SERVICE_NAME);

export async function gracefulShutdown(signal: string): Promise<void> {
  logger.info("shutdown_initiated", {
    event: "shutdown_initiated",
    service: SERVICE_NAME,
    signal,
  });

  try {
    await disconnectRabbitMQ();
    logger.info("rabbitmq_disconnected", {
      event: "rabbitmq_disconnected",
      service: SERVICE_NAME,
    });

    await disconnectPostgres();

    logger.info("shutdown_complete", {
      event: "shutdown_complete",
      service: SERVICE_NAME,
    });

    process.exit(0);
  } catch (err) {
    logger.error("shutdown_error", {
      event: "shutdown_error",
      service: SERVICE_NAME,
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}