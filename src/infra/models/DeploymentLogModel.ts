import mongoose, { Schema } from "mongoose";
import type { IDeploymentLog } from "../../shared/types";

const DeploymentLogSchema = new Schema<IDeploymentLog>(
  {
    deploymentId: {
      type: String,
      required: true,
      index: true,
    },
    seq: {
      type: Number,
      required: true,
      min: 1,
    },
    ts: {
      type: Date,
      required: true,
    },
    line: {
      type: String,
      required: true,
      maxlength: 4_000,
    },
    phase: {
      type: String,
      enum: ["clone", "build", "run", "register", "system"],
      required: true,
    },
  },
  {
    collection: "deployment_logs",
  }
);

// Primary read: all logs for a deployment ordered by seq
DeploymentLogSchema.index({ deploymentId: 1, seq: 1 }, { unique: true });

// Phase filter for log viewer
DeploymentLogSchema.index({ deploymentId: 1, phase: 1, seq: 1 });

export default mongoose.model<IDeploymentLog>(
  "DeploymentLog",
  DeploymentLogSchema
);