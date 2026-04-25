import Dockerode from "dockerode";
import { deploymentRepository } from "./deployment.repository";
import { PORT_RANGE } from "../../shared/constants";
import { DockerError } from "../../shared/utils/error";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";
import {
  containerStartDuration,
  containerStopTotal,
} from "../../shared/utils/dockerContainerMetrics";
import { trackError } from "../../shared/utils/metrics";

const logger = createLogger(SERVICE_NAME);
const docker = new Dockerode({ socketPath: "/var/run/docker.sock" });

interface RunContainerOptions {
  deploymentId: string;
  imageTag: string;
  hostPort: number;
}

class DockerService {
  async allocatePort(): Promise<number> {
    const usedPorts = await deploymentRepository.findAllocatedPorts();
    const usedSet = new Set(usedPorts);

    for (let port = PORT_RANGE.MIN; port <= PORT_RANGE.MAX; port++) {
      if (!usedSet.has(port)) return port;
    }

    throw new DockerError("No available ports in range", {
      min: PORT_RANGE.MIN,
      max: PORT_RANGE.MAX,
    });
  }

  async runContainer(options: RunContainerOptions): Promise<string> {
    const { deploymentId, imageTag, hostPort } = options;
    const end = containerStartDuration.startTimer();
    try {
      const container = await docker.createContainer({
        Image: imageTag,
        name: `brimble-${deploymentId}`,

        Env: [`PORT=80`],
        ExposedPorts: { "80/tcp": {} },
        HostConfig: {
          PortBindings: {
            "80/tcp": [{ HostPort: String(hostPort) }],
          },
          RestartPolicy: { Name: "unless-stopped" },
          NetworkMode: "brimble_brimble-network",
        },
      });
      await container.start();

      logger.info("docker_service_container_started", {
        event: "docker_service_container_started",
        service: SERVICE_NAME,
        deploymentId,
        containerId: container.id.slice(0, 12),
        hostPort,
      });
      end({ status: "success" });
      return container.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      end({ status: "error" });
      trackError(
        "container_start_failed",
        "run_container",
        options.deploymentId,
        "high",
      );

      logger.error("docker_service_run_failed", {
        event: "docker_service_run_failed",
        service: SERVICE_NAME,
        deploymentId,
        error: message,
      });

      throw new DockerError(message, { deploymentId, imageTag, hostPort });
    }
  }

  async stopContainer(containerId: string): Promise<void> {
    try {
      containerStopTotal.inc({ status: "success" });
      const container = docker.getContainer(containerId);
      await container.stop();
      await container.remove();

      logger.info("docker_service_container_stopped", {
        event: "docker_service_container_stopped",
        service: SERVICE_NAME,
        containerId: containerId.slice(0, 12),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      containerStopTotal.inc({ status: "error" });
      trackError(
        "container_stop_failed",
        "stop_container",
        containerId,
        "medium",
      );

      logger.error("docker_service_stop_failed", {
        event: "docker_service_stop_failed",
        service: SERVICE_NAME,
        containerId,
        error: message,
      });

      throw new DockerError(message, { containerId });
    }
  }
}

export const dockerService = new DockerService();
