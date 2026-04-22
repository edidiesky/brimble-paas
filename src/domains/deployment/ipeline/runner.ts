import { deploymentRepository } from "../deployment.repository";
import { deploymentEventBus } from "../events/bus";
import { createLogWriter } from "./log-writer";
import { cloneStep } from "./steps/clone";
import { buildStep } from "./steps/build";
import { runStep } from "./steps/run";
import { registerStep } from "./steps/register";
import { createLogger } from "../../../shared/utils/logger";
import { SERVICE_NAME } from "../../../shared/constants";

const logger = createLogger(SERVICE_NAME);

export class PipelineRunner {
  constructor(private readonly deploymentId: string) {}

  async run(sourceType: string, sourceRef: string): Promise<void> {
    const { deploymentId } = this;
    const log = createLogWriter(deploymentId);

    try {
      // building
      await deploymentRepository.updateStatus(deploymentId, "building");
      deploymentEventBus.emitStatus(deploymentId, "building");
      log("Pipeline started", "system");

      // clone
      const workDir = await cloneStep(deploymentId, sourceType, sourceRef, log);

      // build
      const imageTag = await buildStep(deploymentId, workDir, log);
      await deploymentRepository.updateStatus(deploymentId, "deploying", {
        imageTag,
      });
      deploymentEventBus.emitStatus(deploymentId, "deploying");

      // run
      const { containerId, hostPort } = await runStep(
        deploymentId,
        imageTag,
        log,
      );

      // register
      const url = await registerStep(deploymentId, hostPort, log);

      await deploymentRepository.updateStatus(deploymentId, "running", {
        containerId,
        hostPort,
        url,
      });
      deploymentEventBus.emitStatus(deploymentId, "running");

      log(`Deployment live at ${url}`, "system");

      logger.info("pipeline_runner_completed", {
        event: "pipeline_runner_completed",
        service: SERVICE_NAME,
        deploymentId,
        url,
        imageTag,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      log(`Pipeline failed: ${message}`, "system");

      await deploymentRepository.updateStatus(deploymentId, "failed", {
        lastError: message,
      });
      deploymentEventBus.emitStatus(deploymentId, "failed");

      logger.error("pipeline_runner_failed", {
        event: "pipeline_runner_failed",
        service: SERVICE_NAME,
        deploymentId,
        error: message,
      });

      throw err;
    }
  }
}
