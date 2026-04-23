import { connectPostgres } from "./infra/config/postgres";
import { connectRabbitMQ } from "./infra/messaging/connection";
import { connectDeploymentConsumer } from "./infra/messaging/consumers/deployment.consumer";
import { createLogger } from "./shared/utils/logger";
import { SERVICE_NAME, DATABASE_URL } from "./shared/constants";
import { startOutboxPoller } from "./shared/utils/outbox-poller";

const logger = createLogger(SERVICE_NAME);

export async function bootStrap(): Promise<void> {
  await connectPostgres(DATABASE_URL);

  await connectRabbitMQ();
  logger.info("rabbitmq_connected", {
    event: "rabbitmq_connected",
    service: SERVICE_NAME,
  });

  await connectDeploymentConsumer();
  logger.info("consumers_started", {
    event: "consumers_started",
    service: SERVICE_NAME,
  });

  logger.info("bootstrap_complete", {
    event: "bootstrap_complete",
    service: SERVICE_NAME,
  });

  startOutboxPoller();
  logger.info("outbox_poller_started", {
    event: "outbox_poller_started",
    service: SERVICE_NAME,
  });
}
