import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";
import { app } from "../../app";
import { getPool } from "../../infra/db/pool";

jest.mock("../../infra/db/pool");

const mockGetPool = getPool as jest.MockedFunction<typeof getPool>;

const mockDeadLetterRow = {
  id: "dl-001",
  job_id: "job-abc-123",
  job_type: "DEPLOYMENT",
  tenant_id: "system",
  payload: JSON.stringify({ deploymentId: "dep-001" }),
  attempts: 3,
  errors: JSON.stringify([
    { attempt: 3, error: "railpack exited with code 1", occurredAt: new Date() },
  ]),
  dead_at: new Date(),
  resolved_at: null,
  resolved_by: null,
  resolution: null,
  expires_at: new Date(Date.now() + 86400000 * 30),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/v1/dead-letters", () => {
  it("returns paginated unresolved dead letters", async () => {
    mockGetPool.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [mockDeadLetterRow] })
        .mockResolvedValueOnce({ rows: [{ count: "1" }] }),
    } as never);

    const res = await request(app).get("/api/v1/dead-letters");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].jobId).toBe("job-abc-123");
  });

  it("returns 400 for invalid jobType", async () => {
    const res = await request(app).get(
      "/api/v1/dead-letters?jobType=INVALID_TYPE"
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/dead-letters/:jobId", () => {
  it("returns a single dead letter", async () => {
    mockGetPool.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [mockDeadLetterRow] }),
    } as never);

    const res = await request(app).get("/api/v1/dead-letters/job-abc-123");

    expect(res.status).toBe(200);
    expect(res.body.jobType).toBe("DEPLOYMENT");
  });

  it("returns 404 when dead letter not found", async () => {
    mockGetPool.mockReturnValue({
      query: jest.fn().mockResolvedValueOnce({ rows: [] }),
    } as never);

    const res = await request(app).get("/api/v1/dead-letters/nonexistent");

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/dead-letters/:jobId/resolve", () => {
  it("resolves a dead letter", async () => {
    const resolvedRow = {
      ...mockDeadLetterRow,
      resolved_at: new Date(),
      resolved_by: "system",
      resolution: "Manually resolved after investigation",
    };

    mockGetPool.mockReturnValue({
      query: jest.fn().mockResolvedValueOnce({ rows: [resolvedRow] }),
    } as never);

    const res = await request(app)
      .patch("/api/v1/dead-letters/job-abc-123/resolve")
      .send({ resolution: "Manually resolved after investigation" });

    expect(res.status).toBe(200);
    expect(res.body.resolution).toBe("Manually resolved after investigation");
  });

  it("returns 400 when resolution is too short", async () => {
    const res = await request(app)
      .patch("/api/v1/dead-letters/job-abc-123/resolve")
      .send({ resolution: "ok" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when resolution is missing", async () => {
    const res = await request(app)
      .patch("/api/v1/dead-letters/job-abc-123/resolve")
      .send({});

    expect(res.status).toBe(400);
  });
});