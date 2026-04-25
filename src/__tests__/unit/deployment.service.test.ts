import { describe, it, expect, jest, beforeEach } from "@jest/globals";

jest.mock("../domains/deployment/deployment.repository");
jest.mock("../domains/outbox/outbox.repository");

import { deploymentService } from "../../domains/deployment/deployment.service";
import { deploymentRepository } from "../../domains/deployment/deployment.repository";
import { outboxRepository } from "../../domains/outbox/outbox.repository";

const mockRepo = deploymentRepository as jest.Mocked<typeof deploymentRepository>;
const mockOutbox = outboxRepository as jest.Mocked<typeof outboxRepository>;

const mockDeployment = {
  id: "dep-001",
  name: "my-app",
  sourceType: "git",
  sourceRef: "https://github.com/user/repo",
  status: "pending" as const,
  attempts: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("deploymentService.create", () => {
  it("creates a deployment when name does not exist", async () => {
    mockRepo.findByName.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(mockDeployment);
    mockOutbox.create.mockResolvedValue(undefined as never);

    const result = await deploymentService.create({
      name: "my-app",
      sourceType: "git",
      sourceRef: "https://github.com/user/repo",
    });

    expect(mockRepo.findByName).toHaveBeenCalledWith("my-app");
    expect(mockRepo.create).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("dep-001");
  });

  it("throws 409 when deployment name already exists", async () => {
    mockRepo.findByName.mockResolvedValue(mockDeployment);

    await expect(
      deploymentService.create({
        name: "my-app",
        sourceType: "git",
        sourceRef: "https://github.com/user/repo",
      })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it("throws 404 when findById returns null", async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      deploymentService.findById("nonexistent-id")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("deploymentService.findAll", () => {
  it("returns paginated deployments", async () => {
    mockRepo.findAll.mockResolvedValue({
      data: [mockDeployment],
      totalCount: 1,
      page: 1,
      limit: 10,
    });

    const result = await deploymentService.findAll(1, 10);
    expect(result.totalCount).toBe(1);
    expect(result.data).toHaveLength(1);
  });
});