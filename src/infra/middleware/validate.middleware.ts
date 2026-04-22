import type { Request, Response, NextFunction } from "express";
import type { Schema } from "joi";
import { HTTP_STATUS } from "../../shared/constants";

interface FileValidationOptions {
  required: boolean;
  mimeTypes: string[];
  maxSizeBytes?: number;
}

interface ValidateRequestOptions {
  body?: Schema;
  file?: FileValidationOptions;
}

export function validateRequest(options: ValidateRequestOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Body validation
    if (options.body) {
      const { error } = options.body.validate(req.body, {
        abortEarly: true,
        stripUnknown: true,
      });

      if (error) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: error.details[0].message,
        });
        return;
      }
    }

    // File validation
    if (options.file) {
      const { required, mimeTypes, maxSizeBytes } = options.file;

      if (required && !req.file) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: "File is required",
        });
        return;
      }

      if (req.file) {
        if (!mimeTypes.includes(req.file.mimetype)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({
            error: `Invalid file type. Allowed: ${mimeTypes.join(", ")}`,
          });
          return;
        }

        if (maxSizeBytes && req.file.size > maxSizeBytes) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({
            error: `File too large. Max size: ${maxSizeBytes / 1024 / 1024}MB`,
          });
          return;
        }
      }
    }

    next();
  };
}