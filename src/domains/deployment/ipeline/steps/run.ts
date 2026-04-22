import type { LogWriter } from "../log-writer";
import { dockerService } from "../../deployment.docker.service";
import { PipelineError } from "../../../../shared/utils/error";

export async function runStep(
  deploymentId: string,
  imageTag: string,
  log: LogWriter
): Promise<{ containerId: string; hostPort: number }> {
  try {
    log(`Allocating port for container`, "run");

    const hostPort = await dockerService.allocatePort();

    log(`Allocated port: ${hostPort}`, "run");
    log(`Starting container from image: ${imageTag}`, "run");

    const containerId = await dockerService.runContainer({
      deploymentId,
      imageTag,
      hostPort,
    });

    log(`Container started: ${containerId.slice(0, 12)} on :${hostPort}`, "run");

    return { containerId, hostPort };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`Run failed: ${message}`, "run");
    throw new PipelineError(message, deploymentId, "run");
  }
}