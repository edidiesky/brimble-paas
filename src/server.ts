import { app } from "./app";
import { bootStrap } from "./bootStrap";
import { registerShutdownHooks } from "./shutdown";
import { createLogger } from "./shared/utils/logger";
import { SERVICE_NAME, PORT, METRICS_PORT } from "./shared/constants";
const logger = createLogger(SERVICE_NAME);

async function main(): Promise<void> {
  await bootStrap();
  const server = app.listen(PORT, ()=> {})
  await registerShutdownHooks(server)
}

main().catch((err) => {
  logger.error("startup_failed", {
    event: "startup_failed",
    service: SERVICE_NAME,
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
