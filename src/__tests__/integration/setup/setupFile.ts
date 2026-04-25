// import { Pool } from "pg";
// import { beforeAll, afterAll, beforeEach, jest } from "@jest/globals";

// jest.setTimeout(15000);

// jest.mock("../../infra/db/pool", () => ({
//   getPool: jest.fn(),
// }));

// // Mock RabbitMQ producer so tests never hit AMQP
// jest.mock("../../infra/messaging/producer", () => ({
//   publishToExchange: jest.fn().mockResolvedValue(undefined),
// }));

// // Mock outbox so service tests do not need a real DB write
// jest.mock("../../domains/outbox/outbox.repository", () => ({
//   outboxRepository: {
//     create: jest.fn().mockResolvedValue(undefined),
//   },
// }));

// export function createMockPool(
//   queryImpl: (text: string, values?: unknown[]) => { rows: Record<string, unknown>[] }
// ): jest.Mocked<Pick<Pool, "query" | "connect">> {
//   return {
//     query: jest.fn().mockImplementation(
//       (text: string, values?: unknown[]) =>
//         Promise.resolve(queryImpl(text, values))
//     ) as jest.MockedFunction<Pool["query"]>,
//     connect: jest.fn(),
//   } as unknown as jest.Mocked<Pick<Pool, "query" | "connect">>;
// }