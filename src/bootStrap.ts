import { connectPostgres } from "./infra/config/postgres";
import { connectRabbitMQ } from "./infra/messaging/connection";
import { connectDeploymentConsumer } from "./infra/messaging/consumers/deployment.consumer";
import { createLogger } from "./shared/utils/logger";
import { SERVICE_NAME, DATABASE_URL } from "./shared/constants";
import { startOutboxPoller } from "./shared/utils/outbox-poller";

const logger = createLogger(SERVICE_NAME);

const buidInitSteps: Array<{ name: string; fn: () => void }> = [
  {
    name: "PostgreSQL",
    fn: () => connectPostgres(DATABASE_URL),
  },
  {
    name: "RabbitMQ Connection",
    fn: () => connectRabbitMQ(),
  },
  {
    name: "Deployment Consuemr",
    fn: () => connectDeploymentConsumer(),
  },
  {
    name: "Outbox Poller",
    fn: () => startOutboxPoller(),
  },
];

export async function bootStrap(): Promise<void> {
  const steps = buidInitSteps;
  for (let step of steps) {
    try {
      step.fn();
      logger.info(`${step.name} has been initialized succesfully!`, {
        event: `${step.name}_started`,
        service: SERVICE_NAME,
      });
    } catch (error) {
      logger.info(`${step.name} failed to be initialized succesfully!`, {
        event: `${step.name}_failed_startup`,
        service: SERVICE_NAME,
      });
    }
  }
}
