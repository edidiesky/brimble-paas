import { deploymentRepository } from "./deployment.repository";
import { deploymentLogRepository } from "../deployment-log/deployment-log.repository";
import { deploymentEventBus } from "./events/bus";
import { publishDeploymentRequested } from "../../infra/messaging/producer";
import {
  initSSEResponse,
  writeSEEEvent,
  writeSSEHeartbeat,
} from "../../infra/sse/see.writer";
import { NotFoundError } from "../../shared/utils/error";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";
import { trackError } from "../../shared/utils/metrics";
import type {
  IDeployment,
  DeploymentSource,
  LogEvent,
  StatusEvent,
  DeploymentLogData,
  DeploymentDoneData,
  DeploymentStatusData,
} from "../../shared/types";
import type { Request, Response } from "express";
import {
  deploymentCreatedCounter,
  deploymentNotFoundCounter,
  deploymentPublishErrorCounter,
} from "../../shared/utils/deploymentMetrics";
import {
  sseActiveConnections,
  sseConnectionDuration,
  sseReplaySize,
} from "../../shared/utils/sseMetrics";

const logger = createLogger(SERVICE_NAME);
const DOMAIN = "deployment";

//  Service
class DeploymentService {
  async createDeployment(
    sourceType: DeploymentSource,
    sourceRef: string,
    name?: string,
    requestId?: string,
  ): Promise<IDeployment> {
    const deployment = await deploymentRepository.create({
      sourceType,
      sourceRef,
      name,
    });

    const deploymentId = deployment.id.toString();

    try {
      await publishDeploymentRequested({
        deploymentId,
        sourceType,
        sourceRef,
        attempt: 0,
        requestId,
      });
    } catch (err) {
      deploymentPublishErrorCounter.inc();
      trackError("publish_failed", "deployment_create", DOMAIN, "critical");
      logger.error("deployment_service_publish_failed", {
        event: "deployment_service_publish_failed",
        service: SERVICE_NAME,
        domain: DOMAIN,
        deploymentId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    deploymentCreatedCounter.inc({ source_type: sourceType });

    logger.info("deployment_service_created", {
      event: "deployment_service_created",
      service: SERVICE_NAME,
      domain: DOMAIN,
      deploymentId,
      sourceType,
      requestId,
    });

    return deployment;
  }

  async listDeployments(): Promise<IDeployment[]> {
    return deploymentRepository.findAll();
  }

  async getDeployment(id: string): Promise<IDeployment> {
    const deployment = await deploymentRepository.findById(id);

    if (!deployment) {
      deploymentNotFoundCounter.inc();
      throw new NotFoundError("Deployment", id.toString());
    }

    return deployment;
  }

  async streamLogs(
    deploymentId: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    initSSEResponse(res);

    sseActiveConnections.inc();
    const sseStart = process.hrtime();

    const endSSE = (exitReason: "terminal_status" | "client_disconnect") => {
      sseActiveConnections.dec();
      const [sec, ns] = process.hrtime(sseStart);
      sseConnectionDuration.observe(
        { exit_reason: exitReason },
        sec + ns / 1e9,
      );
    };

    // Replay persisted logs
    const existingLogs =
      await deploymentLogRepository.findByDeploymentId(deploymentId);

    sseReplaySize.observe(existingLogs.length);

    for (const log of existingLogs) {
      writeSEEEvent(res, {
        type: "log",
        data: {
          deploymentId: log.deploymentId,
          seq: log.seq,
          ts: log.ts.toISOString(),
          line: log.line,
          phase: log.phase,
        } satisfies DeploymentLogData,
      });
    }

    const deployment = await deploymentRepository.findById(deploymentId);
    if (
      deployment &&
      (deployment.status === "running" || deployment.status === "failed")
    ) {
      writeSEEEvent(res, {
        type: "done",
        data: {
          type: "done",
          status: deployment.status,
        } satisfies DeploymentDoneData,
      });
      endSSE("terminal_status");
      res.end();
      return;
    }

    // Subscribe to live log events
    const unsubLog = deploymentEventBus.onLog(
      deploymentId,
      (event: LogEvent) => {
        writeSEEEvent(res, {
          type: "log",
          data: {
            deploymentId: event.deploymentId,
            seq: event.seq,
            ts: event.ts,
            line: event.line,
            phase: event.phase,
          } satisfies DeploymentLogData,
        });
      },
    );

    // Subscribe to status events
    const unsubStatus = deploymentEventBus.onStatus(
      deploymentId,
      (event: StatusEvent) => {
        writeSEEEvent(res, {
          type: "status",
          data: {
            type: "status",
            deploymentId: event.deploymentId,
            status: event.status,
          } satisfies DeploymentStatusData,
        });

        if (event.status === "running" || event.status === "failed") {
          writeSEEEvent(res, {
            type: "done",
            data: {
              type: "done",
              status: event.status,
            } satisfies DeploymentDoneData,
          });
          endSSE("terminal_status");
          cleanup();
        }
      },
    );

    // Heartbeat every 15s to keep connection alive
    const heartbeatTimer = setInterval(() => {
      if (!res.writableEnded) {
        writeSSEHeartbeat(res);
      }
    }, 15_000);

    const cleanup = () => {
      clearInterval(heartbeatTimer);
      unsubLog();
      unsubStatus();
      if (!res.writableEnded) res.end();
    };

    req.on("close", () => {
      endSSE("client_disconnect");
      cleanup();
    });
  }
}

export const deploymentService = new DeploymentService();
