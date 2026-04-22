import type { ClientSession } from "mongoose";
import DeploymentLogModel from "../../infra/models/DeploymentLogModel";
import type { IDeploymentLog, LogPhase } from "../../shared/types";

class DeploymentLogRepository {
  async insert(
    log: Omit<IDeploymentLog, "_id">,
    session?: ClientSession
  ): Promise<void> {
    await DeploymentLogModel.create([log], { session });
  }

  async insertMany(
    logs: Omit<IDeploymentLog, "_id">[],
    session?: ClientSession
  ): Promise<void> {
    if (logs.length === 0) return;
    await DeploymentLogModel.insertMany(logs, { session });
  }

  async findByDeploymentId(
    deploymentId: string,
    phase?: LogPhase
  ): Promise<IDeploymentLog[]> {
    const filter: Record<string, unknown> = { deploymentId };
    if (phase) filter.phase = phase;

    return DeploymentLogModel.find(filter).sort({ seq: 1 }).lean();
  }

  async getNextSeq(deploymentId: string): Promise<number> {
    const last = await DeploymentLogModel.findOne({ deploymentId })
      .sort({ seq: -1 })
      .select("seq")
      .lean();

    return (last?.seq ?? 0) + 1;
  }

  async countByDeploymentId(deploymentId: string): Promise<number> {
    return DeploymentLogModel.countDocuments({ deploymentId });
  }
}

export const deploymentLogRepository = new DeploymentLogRepository();