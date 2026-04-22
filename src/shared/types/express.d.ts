import type { Request } from "express";

export interface AuthenticatedRequest extends Request {
  requestId: string;
  user: {
    userId: string;
  };
}