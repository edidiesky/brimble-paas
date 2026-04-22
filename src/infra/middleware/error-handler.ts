import type { Request, Response, NextFunction } from "express";
import { isAppError } from "../../shared/utils/error";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME, HTTP_STATUS } from "../../shared/constants";
import type { AuthenticatedRequest } from "../../shared/types";

const logger = createLogger(SERVICE_NAME);

export function errorHandler(
  err: unknown, 
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as AuthenticatedRequest).requestId;

  if (isAppError(err)) {
    logger.warn("app_error", {
      event: "app_error",
      service: SERVICE_NAME,
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      context: err.context,
      requestId,
    });

    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.context && { context: err.context }),
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";

  logger.error("unhandled_error", {
    event: "unhandled_error",
    service: SERVICE_NAME,
    message,
    stack: err instanceof Error ? err.stack : undefined,
    requestId,
  });

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
  });
}