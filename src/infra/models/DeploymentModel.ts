import mongoose, { Schema } from "mongoose";
import type { IDeployment } from "../../shared/types";

const DeploymentSchema = new Schema<IDeployment>(
  {
    name: {
      type: String,
      maxlength: 100,
    },
    sourceType: {
      type: String,
      enum: ["git", "upload"],
      required: true,
    },
    sourceRef: {
      type: String,
      required: true,
      maxlength: 2_000,
    },
    status: {
      type: String,
      enum: ["pending", "building", "deploying", "running", "failed"],
      default: "pending",
      index: true,
    },
    imageTag: {
      type: String,
    },
    containerId: {
      type: String,
    },
    hostPort: {
      type: Number,
      min: 30000,
      max: 32000,
    },
    url: {
      type: String,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastError: {
      type: String,
      maxlength: 2_000,
    },
  },
  {
    timestamps: true,
    collection: "deployments",
  }
);

DeploymentSchema.index({ createdAt: -1 });
DeploymentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IDeployment>("Deployment", DeploymentSchema);