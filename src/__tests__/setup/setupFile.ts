import IORedisMock from "ioredis-mock";
import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from "@jest/globals";

const redisMockInstance = new IORedisMock();

jest.mock("../../infra/redis/redis.client", () => {
  const IORedisMock = require("ioredis-mock");
  const instance = new IORedisMock();
  return {
    getRedisClientSync: jest.fn(() => instance),
    getRedisClient: jest.fn(async () => instance),
    connectRedis: jest.fn(async () => instance),
    disconnectRedis: jest.fn(async () => undefined),
    isRedisReady: jest.fn(() => true),
    getRedisServerTimeMs: jest.fn(async () => Date.now()),
  };
});

jest.mock("../../infra/messaging/connection", () => ({
  connectRabbitMQ: jest.fn(async () => undefined),
  disconnectRabbitMQ: jest.fn(async () => undefined),
  getRabbitMQChannel: jest.fn(() => ({
    publish: jest.fn(),
    consume: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
    prefetch: jest.fn(),
  })),
}));

jest.mock("../../infra/messaging/consumers/deployment.consumer", () => ({
  connectDeploymentConsumer: jest.fn(async () => undefined),
}));

jest.mock("../../domains/outbox/outbox.repository", () => ({
  outboxRepository: {
    create: jest.fn(async () => undefined),
  },
}));

jest.mock("../../shared/utils/outbox-poller", () => ({
  startOutboxPoller: jest.fn(),
  stopOutboxPoller: jest.fn(),
}));
jest.mock("../../shared/utils/metrics", () => ({
  measureDatabaseQuery: jest.fn(
    async (_op: unknown, fn: () => Promise<unknown>) => fn(),
  ),
  trackError: jest.fn(),
  trackHttpRequest: jest.fn(),
  measurePipelinePhase: jest.fn(
    async (_phase: unknown, _domain: unknown, fn: () => Promise<unknown>) =>
      fn(),
  ),
  brimbleRegistry: {
    contentType: "text/plain",
    metrics: jest.fn(async () => ""),
  },
  
  cacheHitsTotal: { inc: jest.fn() },
  cacheMissesTotal: { inc: jest.fn() },
  cacheErrorsTotal: { inc: jest.fn() },
  cacheOperationDuration: { startTimer: jest.fn(() => jest.fn()) },
  cacheInvalidationsTotal: { inc: jest.fn() },
  // DB pool metric stubs
  dbPoolCheckoutDuration: { observe: jest.fn() },
  dbPoolSize: { set: jest.fn() },
  dbPoolIdleConnections: { set: jest.fn() },
  dbPoolWaitingCount: { set: jest.fn() },
  serviceHealth: { set: jest.fn() },
}));

import { initPool, closePool, getPool } from "../../infra/db/pool";

const TABLES_TO_TRUNCATE = [
  "deployment_logs",
  "dead_letters",
  "outbox",
  "deployments",
];

if (process.env.TEST_DATABASE_URL) {
  beforeAll(async () => {
    await initPool(process.env.TEST_DATABASE_URL!);
  });

  beforeEach(async () => {
    const pool = getPool();
    await pool.query(
      `TRUNCATE TABLE ${TABLES_TO_TRUNCATE.join(", ")} RESTART IDENTITY CASCADE`,
    );
  });

  afterAll(async () => {
    await closePool();
  });
}

export { redisMockInstance };