import mongoose from "mongoose";
import { connectRabbitMQ } from "./infra/messaging/connection";
import { connectDeploymentConsumer } from "./infra/messaging/consumers/deployment.consumer";
import { createLogger } from "./shared/utils/logger";
import { SERVICE_NAME, DATABASE_URL } from "./shared/constants";

const logger = createLogger(SERVICE_NAME);

export async function bootStrap(): Promise<void> {
  // MongoDB
  await mongoose.connect(DATABASE_URL);
  logger.info("mongodb_connected", {
    event: "mongodb_connected",
    service: SERVICE_NAME,
  });

  // RabbitMQ
  await connectRabbitMQ();
  logger.info("rabbitmq_connected", {
    event: "rabbitmq_connected",
    service: SERVICE_NAME,
  });

  // Consumers
  await connectDeploymentConsumer();
  logger.info("consumers_started", {
    event: "consumers_started",
    service: SERVICE_NAME,
  });

  logger.info("bootstrap_complete", {
    event: "bootstrap_complete",
    service: SERVICE_NAME,
  });
}