import mongoose from "mongoose";
import { deadLetterRepository } from "./dead-letter.repository";
import { outboxRepository } from "../outbox/outbox.repository";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";
import type {
  IDeadLetter,
  JobType,
  PaginatedResult,
} from "../../shared/types";

const logger = createLogger(SERVICE_NAME);

interface DeadLetterInput {
  jobId: string;
  jobType: JobType;
  tenantId: string;
  payload: Record<string, unknown>;
  attempts: number;
  lastError: string;
}

class DeadLetterService {
  async create(input: DeadLetterInput): Promise<void> {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await deadLetterRepository.create(
          {
            jobId: input.jobId,
            jobType: input.jobType,
            tenantId: input.tenantId,
            payload: input.payload,
            attempts: input.attempts,
            errors: [
              {
                attempt: input.attempts,
                error: input.lastError,
                occurredAt: new Date(),
              },
            ],
          },
          session
        );

        await outboxRepository.create(
          {
            type: "deployment.dead.topic",
            payload: {
              jobId: input.jobId,
              jobType: input.jobType,
              tenantId: input.tenantId,
              totalAttempts: input.attempts,
              lastError: input.lastError,
              deadAt: new Date().toISOString(),
            },
          },
          session
        );
      });

      logger.error("dead_letter_service_created", {
        event: "dead_letter_service_created",
        service: SERVICE_NAME,
        jobId: input.jobId,
        jobType: input.jobType,
        attempts: input.attempts,
      });
    } catch (error) {
      logger.error("dead_letter_service_create_failed", {
        event: "dead_letter_service_create_failed",
        service: SERVICE_NAME,
        jobId: input.jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findUnresolved(
    tenantId: string | undefined,
    jobType: JobType | undefined,
    page: number,
    limit: number
  ): Promise<PaginatedResult<IDeadLetter>> {
    return deadLetterRepository.findUnresolved(tenantId, jobType, page, limit);
  }

  async findByJobId(jobId: string): Promise<IDeadLetter | null> {
    return deadLetterRepository.findByJobId(jobId);
  }

  async resolve(
    jobId: string,
    resolution: string
  ): Promise<IDeadLetter | null> {
    const doc = await deadLetterRepository.resolve(
      jobId,
      "system",
      resolution
    );

    if (doc) {
      logger.info("dead_letter_service_resolved", {
        event: "dead_letter_service_resolved",
        service: SERVICE_NAME,
        jobId,
      });
    }

    return doc;
  }
}

export const deadLetterService = new DeadLetterService();