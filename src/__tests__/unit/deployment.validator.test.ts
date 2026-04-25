import { describe, it, expect } from "@jest/globals";
import {
  createDeploymentSchema,
} from "../../domains/deployment/deployment.validator";

describe("createDeploymentSchema", () => {
  it("passes with valid git URL and name", () => {
    const { error } = createDeploymentSchema.validate({
      sourceType: "git",
      sourceRef: "https://github.com/user/repo",
      name: "my-app",
    });
    expect(error).toBeUndefined();
  });

  it("fails when sourceRef is missing", () => {
    const { error } = createDeploymentSchema.validate({
      sourceType: "git",
      name: "my-app",
    });
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/sourceRef/i);
  });

  it("fails when name contains spaces", () => {
    const { error } = createDeploymentSchema.validate({
      sourceType: "git",
      sourceRef: "https://github.com/user/repo",
      name: "my app",
    });
    expect(error).toBeDefined();
  });

  it("passes without name since it is optional", () => {
    const { error } = createDeploymentSchema.validate({
      sourceType: "git",
      sourceRef: "https://github.com/user/repo",
    });
    expect(error).toBeUndefined();
  });
});