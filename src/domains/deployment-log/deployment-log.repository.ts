import type { ClientSession, Types } from "mongoose";
import DeploymentModel from "../../infra/models/DeploymentModel";
import type { IDeployment, DeploymentStatus } from "../../shared/types";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";

const logger = createLogger(SERVICE_NAME);

class DeploymentRepository {
  async create(
    data: Pick<IDeployment, "sourceType" | "sourceRef" | "name">,
    session?: ClientSession
  ): Promise<IDeployment> {
    const [doc] = await DeploymentModel.create([data], { session });

    logger.debug("deployment_repository_created", {
      event: "deployment_repository_created",
      service: SERVICE_NAME,
      deploymentId: doc._id.toString(),
    });

    return doc.toObject();
  }

  async findById(id: string | Types.ObjectId): Promise<IDeployment | null> {
    return DeploymentModel.findById(id).lean();
  }

  async findAll(): Promise<IDeployment[]> {
    return DeploymentModel.find().sort({ createdAt: -1 }).lean();
  }

  async findByStatus(status: DeploymentStatus): Promise<IDeployment[]> {
    return DeploymentModel.find({ status }).sort({ createdAt: -1 }).lean();
  }

  async updateStatus(
    id: string | Types.ObjectId,
    status: DeploymentStatus,
    extra?: Partial<
      Pick<
        IDeployment,
        "imageTag" | "containerId" | "hostPort" | "url" | "lastError"
      >
    >,
    session?: ClientSession
  ): Promise<IDeployment | null> {
    const doc = await DeploymentModel.findByIdAndUpdate(
      id,
      { $set: { status, ...extra } },
      { new: true, session }
    ).lean();

    logger.debug("deployment_repository_status_updated", {
      event: "deployment_repository_status_updated",
      service: SERVICE_NAME,
      deploymentId: id.toString(),
      status,
    });

    return doc;
  }

  async incrementAttempts(
    id: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<number> {
    const doc = await DeploymentModel.findByIdAndUpdate(
      id,
      { $inc: { attempts: 1 } },
      { new: true, session }
    ).lean();

    return doc?.attempts ?? 0;
  }

  async findAllocatedPorts(): Promise<number[]> {
    const docs = await DeploymentModel.find(
      { hostPort: { $exists: true } },
      { hostPort: 1 }
    ).lean();

    return docs
      .map((d) => d.hostPort)
      .filter((p): p is number => p !== undefined);
  }
}

export const deploymentRepository = new DeploymentRepository();