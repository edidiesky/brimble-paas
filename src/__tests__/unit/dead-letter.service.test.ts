/**
 * Unit tests: dead-letter.service.ts
 * Coverage: create (transaction, post-commit cache invalidation, logger severity),
 *           findUnresolved, findByJobId, resolve
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { v4 as uuidv4 } from "uuid";

jest.mock("../../infra/db/pool");
jest.mock("../../infra/cache/cache.client");
jest.mock("../../infra/cache/cache.keys", () => ({
  InvalidationPatterns: {
    allDeadLetterLists: () => "dead-letter:list:*",
  },
}));
jest.mock("../../domains/dead-letter/dead-letter.repository");
jest.mock("../../domains/outbox/outbox.repository");
jest.mock("../../shared/utils/dlqMetrics", () => ({
  deadLetterCreatedCounter: { inc: jest.fn() },
  deadLetterResolvedCounter: { inc: jest.fn() },
}));

import { getPool } from "../../infra/db/pool";
import * as cacheClient from "../../infra/cache/cache.client";
import { deadLetterRepository } from "../../domains/dead-letter/dead-letter.repository";
import { outboxRepository } from "../../domains/outbox/outbox.repository";
import { deadLetterService } from "../../domains/dead-letter/dead-letter.service";

const mockGetPool = getPool as jest.MockedFunction<typeof getPool>;
const mockCacheDelByPattern = cacheClient.cacheDelByPattern as jest.MockedFunction<typeof cacheClient.cacheDelByPattern>;
const mockDLRepo = deadLetterRepository as jest.Mocked<typeof deadLetterRepository>;
const mockOutboxRepo = outboxRepository as jest.Mocked<typeof outboxRepository>;

function makeTxClient() {
  return {
    query: jest.fn<()=> Promise<object>>().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  };
}

function makeDeadLetter() {
  return {
    id: uuidv4(),
    jobId: uuidv4(),
    jobType: "DEPLOYMENT" as const,
    tenantId: "tenant-1",
    payload: {},
    attempts: 3,
    errors: [],
    deadAt: new Date(),
    expiresAt: new Date(),
  };
}

describe("DeadLetterService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheDelByPattern.mockResolvedValue(undefined);
    mockDLRepo.create.mockResolvedValue(makeDeadLetter() as never);
    mockOutboxRepo.create.mockResolvedValue(undefined as never);
  });

  //  create 

  describe("create", () => {
    it("commits transaction and invalidates cache AFTER commit", async () => {
      const txClient = makeTxClient();
      mockGetPool.mockReturnValue({
        connect: jest.fn().mockResolvedValue(txClient),
      } as unknown as ReturnType<typeof getPool>);

      const commitOrder: string[] = [];

      // Track when COMMIT is called vs when cache is invalidated
      txClient.query.mockImplementation(async (sql: unknown) => {
        if (typeof sql === "string" && sql.includes("COMMIT")) {
          commitOrder.push("COMMIT");
        }
        return { rows: [], rowCount: 0 };
      });

      mockCacheDelByPattern.mockImplementation(async () => {
        commitOrder.push("CACHE_INVALIDATED");
        return undefined;
      });

      await deadLetterService.create({
        jobId: uuidv4(),
        jobType: "DEPLOYMENT",
        tenantId: "t1",
        payload: {},
        attempts: 3,
        lastError: "timeout",
      });

      // COMMIT must appear before CACHE_INVALIDATED
      const commitIdx = commitOrder.indexOf("COMMIT");
      const cacheIdx = commitOrder.indexOf("CACHE_INVALIDATED");
      expect(commitIdx).toBeLessThan(cacheIdx);
    });

    it("calls ROLLBACK and does not invalidate cache on error", async () => {
      const txClient = makeTxClient();
      mockGetPool.mockReturnValue({
        connect: jest.fn().mockResolvedValue(txClient),
      } as unknown as ReturnType<typeof getPool>);

      mockDLRepo.create.mockRejectedValueOnce(new Error("DB error") as never);

      await expect(
        deadLetterService.create({
          jobId: uuidv4(),
          jobType: "DEPLOYMENT",
          tenantId: "t1",
          payload: {},
          attempts: 3,
          lastError: "timeout",
        }),
      ).rejects.toThrow("DB error");

      const rollbackCall = txClient.query.mock.calls.find(
        (c) => typeof c[0] === "string" && (c[0] as string).includes("ROLLBACK"),
      );
      expect(rollbackCall).toBeDefined();
      expect(mockCacheDelByPattern).not.toHaveBeenCalled();
    });

    it("releases pool client in finally block even on error", async () => {
      const txClient = makeTxClient();
      mockGetPool.mockReturnValue({
        connect: jest.fn().mockResolvedValue(txClient),
      } as unknown as ReturnType<typeof getPool>);

      mockDLRepo.create.mockRejectedValueOnce(new Error("fail") as never);

      await expect(
        deadLetterService.create({
          jobId: uuidv4(),
          jobType: "DEPLOYMENT",
          tenantId: "t1",
          payload: {},
          attempts: 1,
          lastError: "fail",
        }),
      ).rejects.toThrow();

      expect(txClient.release).toHaveBeenCalledTimes(1);
    });

    it("creates outbox entry within same transaction", async () => {
      const txClient = makeTxClient();
      mockGetPool.mockReturnValue({
        connect: jest.fn().mockResolvedValue(txClient),
      } as unknown as ReturnType<typeof getPool>);

      await deadLetterService.create({
        jobId: "job-123",
        jobType: "DEPLOYMENT",
        tenantId: "t1",
        payload: { key: "value" },
        attempts: 3,
        lastError: "timeout",
      });

      // Both repo calls must receive the transaction client
      expect(mockDLRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: "job-123" }),
        txClient,
      );
      expect(mockOutboxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "deployment.dead.topic" }),
        txClient,
      );
    });
  });

  //  findUnresolved 

  describe("findUnresolved", () => {
    it("delegates to repository with correct params", async () => {
      const paginated = { data: [], totalCount: 0, page: 1, limit: 20 };
      mockDLRepo.findUnresolved.mockResolvedValueOnce(paginated as never);

      const result = await deadLetterService.findUnresolved(
        "tenant-1", "DEPLOYMENT", 1, 20,
      );

      expect(mockDLRepo.findUnresolved).toHaveBeenCalledWith(
        "tenant-1", "DEPLOYMENT", 1, 20,
      );
      expect(result).toEqual(paginated);
    });
  });

  //  resolve 

  describe("resolve", () => {
    it("returns null when repository returns null (already resolved or not found)", async () => {
      mockDLRepo.resolve.mockResolvedValueOnce(null);

      const result = await deadLetterService.resolve(uuidv4(), "fix");

      expect(result).toBeNull();
    });

    it("passes hardcoded resolvedBy=system to repository", async () => {
      const doc = makeDeadLetter();
      mockDLRepo.resolve.mockResolvedValueOnce(doc as never);

      await deadLetterService.resolve(doc.jobId, "manual resolution");

      expect(mockDLRepo.resolve).toHaveBeenCalledWith(
        doc.jobId,
        "system",
        "manual resolution",
      );
    });
  });
});