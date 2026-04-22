import mongoose, { Schema } from "mongoose";
import type { IOutbox } from "../../shared/types";

const OutboxSchema = new Schema<IOutbox>(
  {
    type: {
      type: String,
      required: true,
      maxlength: 200,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "published", "failed"],
      default: "pending",
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: "outbox",
  }
);

OutboxSchema.index({ status: 1, createdAt: 1 });
OutboxSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24 * 7,
    partialFilterExpression: { status: "published" },
  }
);

export default mongoose.model<IOutbox>("Outbox", OutboxSchema);