import type { ClientSession } from "mongoose";
import DeadLetterModel from "../../infra/models/DeadLetterModel";
import type { IDeadLetter, JobType, PaginatedResult } from "../../shared/types";

class DeadLetterRepository {
  async create(
    data: Pick<
      IDeadLetter,
      "jobId" | "jobType" | "tenantId" | "payload" | "attempts" | "errors"
    >,
    session?: ClientSession
  ): Promise<IDeadLetter> {
    const [doc] = await DeadLetterModel.create([data], { session });
    return doc.toObject();
  }

  async findByJobId(jobId: string): Promise<IDeadLetter | null> {
    return DeadLetterModel.findOne({ jobId }).lean();
  }

  async findUnresolved(
    tenantId: string | undefined,
    jobType: JobType | undefined,
    page: number,
    limit: number
  ): Promise<PaginatedResult<IDeadLetter>> {
    const filter: Record<string, unknown> = {
      resolvedAt: { $exists: false },
    };

    if (tenantId) filter.tenantId = tenantId;
    if (jobType) filter.jobType = jobType;

    const [data, totalCount] = await Promise.all([
      DeadLetterModel.find(filter)
        .sort({ deadAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DeadLetterModel.countDocuments(filter),
    ]);

    return { data, totalCount, page, limit };
  }

  async resolve(
    jobId: string,
    resolvedBy: string,
    resolution: string,
    session?: ClientSession
  ): Promise<IDeadLetter | null> {
    return DeadLetterModel.findOneAndUpdate(
      { jobId, resolvedAt: { $exists: false } },
      {
        $set: {
          resolvedAt: new Date(),
          resolvedBy,
          resolution,
        },
      },
      { new: true, session }
    ).lean();
  }
}

export const deadLetterRepository = new DeadLetterRepository();