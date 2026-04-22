import type { ClientSession } from "mongoose";
import OutboxModel from "../../infra/models/OutboxModel";
import type { IOutbox } from "../../shared/types";

class OutboxRepository {
  async create(
    data: Pick<IOutbox, "type" | "payload">,
    session?: ClientSession
  ): Promise<IOutbox> {
    const [doc] = await OutboxModel.create(
      [{ ...data, status: "pending", retryCount: 0 }],
      { session }
    );
    return doc.toObject();
  }

  async findPending(limit = 50): Promise<IOutbox[]> {
    return OutboxModel.find({ status: "pending" })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
  }

  async markPublished(
    id: string,
    session?: ClientSession
  ): Promise<void> {
    await OutboxModel.findByIdAndUpdate(
      id,
      { $set: { status: "published" } },
      { session }
    );
  }

  async markFailed(
    id: string,
    session?: ClientSession
  ): Promise<void> {
    await OutboxModel.findByIdAndUpdate(
      id,
      {
        $set: { status: "failed" },
        $inc: { retryCount: 1 },
      },
      { session }
    );
  }
}

export const outboxRepository = new OutboxRepository();