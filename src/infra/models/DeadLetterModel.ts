import mongoose, { Schema } from "mongoose";
import type { IDeadLetter, IDeadLetterError, JobType } from "../../shared/types";
import { DEAD_LETTER_TTL_SECONDS } from "../../shared/constants";

const DeadLetterErrorSchema = new Schema<IDeadLetterError>(
  {
    attempt: {
      type: Number,
      required: true,
      min: 0,
    },
    error: {
      type: String,
      required: true,
      maxlength: 2_000,
    },
    stack: {
      type: String,
      maxlength: 5_000,
    },
    occurredAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const DeadLetterSchema = new Schema<IDeadLetter>(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    jobType: {
      type: String,
      required: true,
      enum: [
        "DEPLOYMENT",
        "RESERVATION_EXPIRY",
        "PAYOUT_BATCH",
        "ORDER_ABANDONMENT",
        "LOW_STOCK_ALERT",
        "SCHEDULED_REPORT",
      ] satisfies JobType[],
    },
    tenantId: {
      type: String,
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    attempts: {
      type: Number,
      required: true,
      min: 1,
    },
    errors: {
      type: [DeadLetterErrorSchema],
      required: true,
      default: [],
      validate: {
        validator: (v: IDeadLetterError[]) => v.length <= 10,
        message: "errors array cannot exceed 10 entries",
      },
    },
    deadAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: String,
      maxlength: 200,
    },
    resolution: {
      type: String,
      maxlength: 1_000,
    },
    expiresAt: {
      type: Date,
      default: () =>
        new Date(Date.now() + DEAD_LETTER_TTL_SECONDS * 1_000),
    },
  },
  {
    timestamps: true,
    collection: "dead_letters",
  }
);

DeadLetterSchema.index({ tenantId: 1, deadAt: -1 });
DeadLetterSchema.index({ jobType: 1, deadAt: -1 });
DeadLetterSchema.index({ resolvedAt: 1, deadAt: -1 });
DeadLetterSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IDeadLetter>("DeadLetter", DeadLetterSchema);