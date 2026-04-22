import { Types } from "mongoose";
import type { Request } from "express";

export type DeploymentStatus =
  | "pending"
  | "building"
  | "deploying"
  | "running"
  | "failed";

export type DeploymentSource = "git" | "upload";

export type LogPhase =
  | "clone"
  | "build"
  | "run"
  | "register"
  | "system";

export type JobType =
  | "DEPLOYMENT"
  | "RESERVATION_EXPIRY"
  | "PAYOUT_BATCH"
  | "ORDER_ABANDONMENT"
  | "LOW_STOCK_ALERT"
  | "SCHEDULED_REPORT";

export interface IDeployment {
  _id: Types.ObjectId;
  name?: string;
  sourceType: DeploymentSource;
  sourceRef: string;
  status: DeploymentStatus;
  imageTag?: string;
  containerId?: string;
  hostPort?: number;
  url?: string;
  attempts: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeploymentLog {
  _id: Types.ObjectId;
  deploymentId: string;
  seq: number;
  ts: Date;
  line: string;
  phase: LogPhase;
}

export interface IDeadLetterError {
  attempt: number;
  error: string;
  stack?: string;
  occurredAt: Date;
}

export interface IDeadLetter {
  _id: Types.ObjectId;
  jobId: string;
  jobType: JobType;
  tenantId: string;
  payload: Record<string, unknown>;
  attempts: number;
  errors: IDeadLetterError[];
  deadAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  expiresAt: Date;
}

export interface IOutbox {
  _id: Types.ObjectId;
  type: string;
  payload: Record<string, unknown>;
  status: "pending" | "published" | "failed";
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeploymentRequestedEvent {
  deploymentId: string;
  sourceType: DeploymentSource;
  sourceRef: string;
  attempt: number;
  requestId?: string;
}

export interface LogEvent {
  deploymentId: string;
  seq: number;
  ts: string;
  line: string;
  phase: LogPhase;
}

export interface StatusEvent {
  type: "status";
  deploymentId: string;
  status: DeploymentStatus;
}

export interface DoneEvent {
  type: "done";
  status: DeploymentStatus;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
}

export type JobPayload = Record<string, unknown>;

export interface AuthenticatedRequest extends Request {
  requestId: string;
  user: {
    userId: string;
  };
}